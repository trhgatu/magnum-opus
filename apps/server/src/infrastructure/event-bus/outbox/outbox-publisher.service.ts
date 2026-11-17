import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { OutboxRegistry } from './outbox-registry';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { OutboxEvent } from '@repo/database';
import { runWithCorrelationId } from '@infrastructure/observability/correlation-context';
import { NonRetryableOutboxError } from './non-retryable-outbox-error';

const OUTBOX_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class OutboxPublisherService
  implements OnApplicationBootstrap, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly maxAttempts = 10;
  private timer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private polling = false;
  private shuttingDown = false;
  private activePoll?: Promise<void>;

  // Khi hạ tầng (database, kết nối) lỗi, vòng quét 100 ms sẽ ném ~10 lỗi mỗi
  // giây vào log — đúng lúc người trực cần đọc log nhất. Hai biến dưới đây
  // giãn dần nhịp quét và chỉ log ở thời điểm đổi trạng thái.
  private consecutiveFailures = 0;
  private nextPollAllowedAt = 0;
  private readonly maxFailureBackoffMs = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: OutboxRegistry,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.configService.get<number>(
      'OUTBOX_POLL_INTERVAL_MS',
      100,
    );
    this.timer = setInterval(() => {
      this.triggerPoll();
    }, intervalMs);
    this.timer.unref();
    this.triggerPoll();

    // Row PUBLISHED chỉ lớn dần mãi nếu không ai dọn. Dọn theo tuổi, mỗi giờ
    // một lần; đặt OUTBOX_RETENTION_DAYS=0 để tắt hẳn.
    const retentionDays = Number(
      this.configService.get<number>('OUTBOX_RETENTION_DAYS', 30),
    );
    if (retentionDays > 0) {
      this.cleanupTimer = setInterval(
        () => void this.cleanupPublished(retentionDays),
        60 * 60 * 1_000,
      );
      this.cleanupTimer.unref();
    }
  }

  async cleanupPublished(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1_000);
    try {
      const deleted = await this.prisma.outboxEvent.deleteMany({
        where: {
          status: OUTBOX_STATUS.PUBLISHED,
          processedAt: { lt: cutoff },
        },
      });
      if (deleted.count > 0) {
        this.logger.log(
          `Outbox cleanup removed ${deleted.count} published events older than ${retentionDays} days`,
        );
      }
      return deleted.count;
    } catch (error: unknown) {
      this.logger.error(
        `Outbox cleanup failed: ${this.getErrorMessage(error)}`,
      );
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopPolling();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.stopPolling();
  }

  private async stopPolling(): Promise<void> {
    this.shuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    await this.activePoll;
  }

  private triggerPoll(): void {
    if (this.shuttingDown || this.activePoll) return;
    this.activePoll = this.poll().finally(() => {
      this.activePoll = undefined;
    });
  }

  async poll(): Promise<void> {
    if (this.shuttingDown || this.polling) return;
    if (Date.now() < this.nextPollAllowedAt) return;
    this.polling = true;

    try {
      await this.recoverStaleClaims();
      const candidates = await this.prisma.outboxEvent.findMany({
        where: {
          status: OUTBOX_STATUS.PENDING,
          availableAt: { lte: new Date() },
          type: { in: this.registry.knownTypes() },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const candidate of candidates) {
        await this.publishCandidate(candidate);
      }
      this.onPollSucceeded();
    } catch (error: unknown) {
      this.onPollFailed(error);
    } finally {
      this.polling = false;
    }
  }

  private onPollSucceeded(): void {
    if (this.consecutiveFailures > 0) {
      this.logger.log(
        `Outbox polling recovered after ${this.consecutiveFailures} consecutive failures`,
      );
    }
    this.consecutiveFailures = 0;
    this.nextPollAllowedAt = 0;
  }

  private onPollFailed(error: unknown): void {
    this.consecutiveFailures += 1;
    const backoffMs = Math.min(
      2 ** this.consecutiveFailures * 250,
      this.maxFailureBackoffMs,
    );
    this.nextPollAllowedAt = Date.now() + backoffMs;

    // Chỉ log lần lỗi đầu tiên và mỗi khi đã chạm trần thời gian chờ —
    // hạ tầng sập không được phép biến log thành vô dụng.
    const atCeiling = backoffMs >= this.maxFailureBackoffMs;
    if (this.consecutiveFailures === 1 || atCeiling) {
      this.logger.error(
        `Outbox polling failed (${this.consecutiveFailures} consecutive, retrying in ${backoffMs}ms): ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async publishCandidate(candidate: OutboxEvent): Promise<void> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: candidate.id,
        status: OUTBOX_STATUS.PENDING,
      },
      data: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return;

    try {
      await runWithCorrelationId(candidate.correlationId ?? '', () =>
        this.registry.dispatch(candidate),
      );

      await this.prisma.outboxEvent.update({
        where: { id: candidate.id },
        data: {
          status: OUTBOX_STATUS.PUBLISHED,
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error: unknown) {
      const attempts = candidate.attempts + 1;
      const exhausted =
        error instanceof NonRetryableOutboxError ||
        attempts >= this.maxAttempts;
      const retryDelayMs = Math.min(2 ** attempts * 1_000, 60_000);

      await this.prisma.outboxEvent.update({
        where: { id: candidate.id },
        data: {
          status: exhausted ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
          availableAt: new Date(Date.now() + retryDelayMs),
          lockedAt: null,
          lastError: this.getErrorMessage(error).slice(0, 2_000),
        },
      });
      this.logger.error(
        `Failed to publish outbox event ${candidate.id}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async recoverStaleClaims(): Promise<void> {
    const staleBefore = new Date(Date.now() - 60_000);
    await this.prisma.outboxEvent.updateMany({
      where: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: { lt: staleBefore },
        attempts: { gte: this.maxAttempts },
      },
      data: {
        status: OUTBOX_STATUS.FAILED,
        lockedAt: null,
        lastError: 'Processing stopped before finishing',
      },
    });

    await this.prisma.outboxEvent.updateMany({
      where: {
        status: OUTBOX_STATUS.PROCESSING,
        lockedAt: { lt: staleBefore },
        attempts: { lt: this.maxAttempts },
      },
      data: {
        status: OUTBOX_STATUS.PENDING,
        lockedAt: null,
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
