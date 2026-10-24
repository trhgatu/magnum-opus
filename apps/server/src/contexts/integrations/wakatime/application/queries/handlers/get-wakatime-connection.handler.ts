import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  WAKATIME_CONNECTION_REPOSITORY,
  type WakaTimeConnectionRepository,
} from '../../../domain/ports/wakatime-connection.repository';
import type { WakaTimeConnection } from '../../../domain/wakatime-connection.entity';
import { GetWakaTimeConnectionQuery } from '../get-wakatime-connection.query';

@QueryHandler(GetWakaTimeConnectionQuery)
export class GetWakaTimeConnectionHandler implements IQueryHandler<
  GetWakaTimeConnectionQuery,
  Result<WakaTimeConnection | null, DomainException>
> {
  constructor(
    @Inject(WAKATIME_CONNECTION_REPOSITORY)
    private readonly repository: WakaTimeConnectionRepository,
  ) {}

  async execute({
    ownerId,
  }: GetWakaTimeConnectionQuery): Promise<
    Result<WakaTimeConnection | null, DomainException>
  > {
    return Result.ok(await this.repository.findByOwner(ownerId));
  }
}
