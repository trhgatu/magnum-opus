import { Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitPermanentlyDeleted } from '@/contexts/forge/habit/contracts/habit-permanently-deleted.contract';

import { ForgetDeletedHabitService } from '../../application/services/forget-deleted-habit.service';

type Payload = PayloadOf<typeof HabitPermanentlyDeleted>;

@Injectable()
@OutboxHandler(HabitPermanentlyDeleted)
export class ForgetDeletedHabitHandler implements OutboxEventHandler<Payload> {
  constructor(private readonly forgetDeletedHabit: ForgetDeletedHabitService) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.forgetDeletedHabit.execute(payload.ownerId, payload.habitId);
  }
}
