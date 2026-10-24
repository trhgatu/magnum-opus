import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  WAKATIME_CONNECTION_REPOSITORY,
  type WakaTimeConnectionRepository,
} from '../../../domain/ports/wakatime-connection.repository';
import { DisconnectWakaTimeCommand } from '../disconnect-wakatime.command';

/**
 * Xóa kết nối. Nguồn WakaTime đang gắn giữ nguyên; lần chép sau chuyển
 * chúng sang DISCONNECTED (BA 08 §4.9) — sổ cũ vẫn dùng được.
 */
@CommandHandler(DisconnectWakaTimeCommand)
export class DisconnectWakaTimeHandler implements ICommandHandler<
  DisconnectWakaTimeCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(WAKATIME_CONNECTION_REPOSITORY)
    private readonly repository: WakaTimeConnectionRepository,
  ) {}

  async execute({
    ownerId,
  }: DisconnectWakaTimeCommand): Promise<Result<void, DomainException>> {
    await this.repository.deleteByOwner(ownerId);
    return Result.ok(undefined);
  }
}
