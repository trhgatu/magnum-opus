import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitPermanentlyDeleted } from '@/contexts/forge/habit/contracts/habit-permanently-deleted.contract';

import { ForgetDeletedHabitHandler } from './forget-deleted-habit.handler';

describe('ForgetDeletedHabitHandler', () => {
  it('listens to HabitPermanentlyDeleted', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, ForgetDeletedHabitHandler),
    ).toBe(HabitPermanentlyDeleted);
  });

  it('makes Chronicle forget the title of the deleted habit', async () => {
    const forget = { execute: jest.fn().mockResolvedValue(undefined) };
    const handler = new ForgetDeletedHabitHandler(forget as never);

    await handler.handle({
      eventId: 'event-id',
      occurredAt: new Date(),
      payload: { habitId: 'habit-id', ownerId: 'owner-id' },
    });

    expect(forget.execute).toHaveBeenCalledWith('owner-id', 'habit-id');
  });
});
