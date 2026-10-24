import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  TOKEN_CIPHER,
  type TokenCipher,
} from '../../../../shared/application/ports/token-cipher.port';
import {
  WAKATIME_CONNECTION_REPOSITORY,
  type WakaTimeConnectionRepository,
} from '../../../domain/ports/wakatime-connection.repository';
import {
  type WakaTimeAccount,
  WakaTimeConnection,
} from '../../../domain/wakatime-connection.entity';
import { CLOCK, type Clock } from '../../ports/clock.port';
import { WAKATIME_API, type WakaTimeApi } from '../../ports/wakatime-api.port';
import { ConnectWakaTimeCommand } from '../connect-wakatime.command';

/**
 * Số lần thử khi đụng độ với một request đồng thời của cùng owner (một
 * connect khác vừa tạo kết nối, hoặc một disconnect vừa xóa nó).
 */
const MAX_ATTEMPTS = 3;

@CommandHandler(ConnectWakaTimeCommand)
export class ConnectWakaTimeHandler implements ICommandHandler<
  ConnectWakaTimeCommand,
  Result<WakaTimeConnection, DomainException>
> {
  constructor(
    @Inject(WAKATIME_API) private readonly wakaTimeApi: WakaTimeApi,
    @Inject(TOKEN_CIPHER) private readonly cipher: TokenCipher,
    @Inject(WAKATIME_CONNECTION_REPOSITORY)
    private readonly repository: WakaTimeConnectionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({
    ownerId,
    apiKey,
    confirmAccountChange,
  }: ConnectWakaTimeCommand): Promise<
    Result<WakaTimeConnection, DomainException>
  > {
    try {
      // Kiểm tra với WakaTime trước: key sai thì không đụng gì tới DB.
      const account = await this.wakaTimeApi.verifyKey(apiKey);
      const encryptedKey = this.cipher.encrypt(apiKey);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const saved = await this.trySave(ownerId, account, encryptedKey, {
          confirmAccountChange,
        });
        if (saved) return Result.ok(saved);
      }

      throw new Error(
        'WakaTime connection kept changing concurrently while connecting',
      );
    } catch (error) {
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }
  }

  /** Một lần thử. null nghĩa là đụng độ với request khác — thử lại. */
  private async trySave(
    ownerId: string,
    account: WakaTimeAccount,
    encryptedKey: string,
    { confirmAccountChange }: { confirmAccountChange: boolean },
  ): Promise<WakaTimeConnection | null> {
    const now = this.clock.now();
    const existing = await this.repository.findByOwner(ownerId);

    if (!existing) {
      const created = WakaTimeConnection.connect({
        id: randomUUID(),
        ownerId,
        account,
        encryptedKey,
        now,
      });
      // false: một request khác vừa tạo kết nối — lần sau đi luồng thay
      // key, kể cả bước xác nhận đổi tài khoản, thay vì ghi đè nó.
      return (await this.repository.insert(created)) ? created : null;
    }

    // Ném WakaTimeAccountChangeUnconfirmedException trước khi ghi gì vào DB.
    existing.replaceKey({ account, encryptedKey, now, confirmAccountChange });
    // false: kết nối vừa bị ngắt — lần sau đi luồng tạo mới.
    return (await this.repository.update(existing)) ? existing : null;
  }
}
