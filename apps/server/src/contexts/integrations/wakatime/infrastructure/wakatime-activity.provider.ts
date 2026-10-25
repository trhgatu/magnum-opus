import {
  type ActivityEventInput,
  type ActivityProviderPort,
  type ActivityResourceRef,
  ActivitySourceError,
  type FetchedActivity,
  type ResolvedResource,
} from '@shared/application/activity';

import type { TokenCipher } from '../../shared/application/ports/token-cipher.port';
import type {
  WakaTimeApi,
  WakaTimeDay,
  WakaTimeProject,
} from '../application/ports/wakatime-api.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import type { WakaTimeConnectionRepository } from '../domain/ports/wakatime-connection.repository';
import type { WakaTimeConnection } from '../domain/wakatime-connection.entity';
import { daysTouching, mapWithLimit } from './wakatime-days';

/** Số ngày hỏi WakaTime cùng lúc khi chép bù (BA 08 §5.3). */
const PARALLEL_DAYS = 4;

/**
 * Nguồn thời gian code từ WakaTime (BA 08 §5.2): mỗi ngày một request,
 * trả về cả những ngày đã đọc trọn để sổ thay theo ngày.
 */
export class WakaTimeActivityProvider implements ActivityProviderPort {
  readonly provider = 'WAKATIME' as const;
  // Ngày ngoài lịch sử được đọc trả 200 rỗng, không phân biệt được với ngày
  // không code (TQ-WAK-04) — không tự phát hiện giới hạn của gói được.
  readonly capabilities = { historyWindowDays: null };

  constructor(
    private readonly connections: WakaTimeConnectionRepository,
    private readonly cipher: TokenCipher,
    private readonly api: WakaTimeApi,
  ) {}

  async fetchEvents(
    resource: ActivityResourceRef,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity> {
    const connection = await this.usableConnection(resource.ownerId);
    // Feed thuộc tài khoản cũ: không chép giờ code của tài khoản mới vào.
    if (connection.account.id !== resource.externalAccountId) {
      throw new ActivitySourceError('WAKATIME_ACCOUNT_CHANGED');
    }

    try {
      return await this.read(connection, resource.externalResourceId, from, to);
    } catch (error) {
      throw await this.sourceError(error, connection);
    }
  }

  async resolveResource(
    ownerId: string,
    externalResourceId: string,
  ): Promise<ResolvedResource> {
    const connection = await this.usableConnection(ownerId);

    try {
      const apiKey = this.cipher.decrypt(connection.encryptedKey);
      const project = await this.findProject(apiKey, externalResourceId);
      return {
        externalAccountId: connection.account.id,
        displayName: project.name,
      };
    } catch (error) {
      throw await this.sourceError(error, connection);
    }
  }

  async connectedAccountId(ownerId: string): Promise<string | null> {
    const connection = await this.connections.findByOwner(ownerId);
    return connection?.account.id ?? null;
  }

  private async read(
    connection: WakaTimeConnection,
    projectId: string,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity> {
    const apiKey = this.cipher.decrypt(connection.encryptedKey);
    const [user, project] = await Promise.all([
      this.api.currentUser(apiKey),
      // Tra lại tên từ id ở mỗi lần chép: đổi tên trên WakaTime thì theo được.
      this.findProject(apiKey, projectId),
    ]);

    // Mới trước: chép bù dở dang thì phần gần đây đã có.
    const dates = daysTouching(from, to, user.timeZone).reverse();
    const days = await mapWithLimit(dates, PARALLEL_DAYS, (date) =>
      this.api.durations(apiKey, date),
    );

    return {
      displayName: project.name,
      events: days.flatMap((day) => codingEvents(day, project.name)),
      // Mỗi ngày đã đọc trọn — kể cả ngày không có đoạn nào, để sổ xóa
      // những gì WakaTime không còn giữ.
      replacedWindows: days.map((day) => ({ from: day.start, to: day.end })),
    };
  }

  private async findProject(
    apiKey: string,
    projectId: string,
  ): Promise<WakaTimeProject> {
    const projects = await this.api.listProjects(apiKey);
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) throw new ActivitySourceError('WAKATIME_PROJECT_NOT_FOUND');
    return project;
  }

  /** Lỗi WakaTime → mã của nguồn; key bị từ chối thì thu hồi có điều kiện. */
  private async sourceError(
    error: unknown,
    connection: WakaTimeConnection,
  ): Promise<unknown> {
    if (error instanceof WakaTimeKeyInvalidException) {
      await this.connections.revokeIfKeyUnchanged(
        connection.ownerId,
        connection.encryptedKey,
      );
      return new ActivitySourceError('WAKATIME_KEY_INVALID');
    }
    if (error instanceof WakaTimeRateLimitedException) {
      const { retryAfter } = error.args as { retryAfter: number };
      return new ActivitySourceError('WAKATIME_RATE_LIMITED', retryAfter);
    }
    if (error instanceof WakaTimeUnavailableException) {
      return new ActivitySourceError('WAKATIME_UNAVAILABLE');
    }
    return error;
  }

  /** Kết nối còn dùng được — chưa gọi WakaTime. */
  private async usableConnection(ownerId: string): Promise<WakaTimeConnection> {
    const connection = await this.connections.findByOwner(ownerId);
    if (!connection) throw new ActivitySourceError('WAKATIME_NOT_CONNECTED');
    if (!connection.isUsable()) {
      throw new ActivitySourceError('WAKATIME_KEY_INVALID');
    }
    return connection;
  }
}

/** Đoạn code của đúng project, cắt vào ngày, thành event CODING_TIME. */
function codingEvents(
  day: WakaTimeDay,
  projectName: string,
): ActivityEventInput[] {
  const events: ActivityEventInput[] = [];

  for (const session of day.sessions) {
    // So chính xác: bộ lọc của WakaTime không phân biệt hoa/thường
    // (TQ-WAK-02), còn danh tính là id đã tra ra tên này (BR-PAC-044).
    if (session.project !== projectName) continue;

    // Sổ thay theo ngày: một đoạn không được chạm sang ngày khác.
    const start = Math.max(session.start.getTime(), day.start.getTime());
    const end = Math.min(
      session.start.getTime() + session.seconds * 1000,
      day.end.getTime(),
    );
    const seconds = Math.round((end - start) / 1000);
    // Sổ chỉ nhận quantity > 0.
    if (seconds < 1) continue;

    const occurredAt = new Date(start);
    events.push({
      kind: 'CODING_TIME',
      occurredAt,
      quantity: seconds,
      dedupeKey: occurredAt.toISOString(),
    });
  }

  return events;
}
