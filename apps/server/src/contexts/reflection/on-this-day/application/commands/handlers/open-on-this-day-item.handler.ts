import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { OnThisDayItemOpenedEvent } from '../../../domain/events/on-this-day-item-opened.event';
import { OnThisDayItemNotFoundException } from '../../../domain/exceptions/on-this-day-item-not-found.exception';
import {
  ON_THIS_DAY_OPENINGS,
  type OnThisDayOpenings,
} from '../../ports/on-this-day-openings.port';
import { GetOnThisDayQuery } from '../../queries/get-on-this-day.query';
import type { OnThisDay } from '../../queries/handlers/get-on-this-day.handler';
import { OpenOnThisDayItemCommand } from '../open-on-this-day-item.command';

/**
 * Chỉ tính khi mục đó đúng là của "Ngày này năm xưa" hôm nay (BR-GDN-LN-008),
 * nên dựng lại đúng danh sách người dùng đang thấy.
 */
@CommandHandler(OpenOnThisDayItemCommand)
export class OpenOnThisDayItemHandler implements ICommandHandler<
  OpenOnThisDayItemCommand,
  Result<void, DomainException>
> {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(ON_THIS_DAY_OPENINGS)
    private readonly openings: OnThisDayOpenings,
  ) {}

  public async execute(
    command: OpenOnThisDayItemCommand,
  ): Promise<Result<void, DomainException>> {
    const today: Result<OnThisDay, DomainException> =
      await this.queryBus.execute(
        new GetOnThisDayQuery(command.ownerId, command.now),
      );
    if (today.isFailure) return Result.fail(today.getError());

    const listed = today
      .unwrap()
      .items.some(
        (item) => item.kind === command.kind && item.id === command.itemId,
      );
    if (!listed) {
      return Result.fail(new OnThisDayItemNotFoundException(command.itemId));
    }

    await this.openings.record(
      new OnThisDayItemOpenedEvent(
        command.ownerId,
        command.kind,
        command.itemId,
        command.now,
      ),
    );
    return Result.ok(undefined);
  }
}
