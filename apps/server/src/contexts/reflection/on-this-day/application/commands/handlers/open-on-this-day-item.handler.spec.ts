import { Result } from '@shared/domain/result';

import { OnThisDayItemOpenedEvent } from '../../../domain/events/on-this-day-item-opened.event';
import { OnThisDayItemNotFoundException } from '../../../domain/exceptions/on-this-day-item-not-found.exception';
import { GetOnThisDayQuery } from '../../queries/get-on-this-day.query';
import { OpenOnThisDayItemCommand } from '../open-on-this-day-item.command';
import { OpenOnThisDayItemHandler } from './open-on-this-day-item.handler';

describe('OpenOnThisDayItemHandler', () => {
  const now = new Date('2026-11-25T03:00:00.000Z');
  const queryBus = { execute: jest.fn() };
  const openings = { record: jest.fn().mockResolvedValue(undefined) };
  const handler = new OpenOnThisDayItemHandler(queryBus as never, openings);

  beforeEach(() => {
    jest.clearAllMocks();
    queryBus.execute.mockResolvedValue(
      Result.ok({
        date: '2026-11-25',
        items: [
          { kind: 'MEMORY', id: 'memory-id', yearsAgo: 3 },
          { kind: 'JOURNAL', id: 'journal-id', yearsAgo: 1 },
        ],
      }),
    );
  });

  it("records an item that is on today's list", async () => {
    const result = await handler.execute(
      new OpenOnThisDayItemCommand('owner-id', 'JOURNAL', 'journal-id', now),
    );

    expect(result.isSuccess).toBe(true);
    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetOnThisDayQuery('owner-id', now),
    );
    expect(openings.record).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'owner-id',
        kind: 'JOURNAL',
        itemId: 'journal-id',
        openedAt: now,
      }),
    );
    expect(openings.record.mock.calls[0]![0]).toBeInstanceOf(
      OnThisDayItemOpenedEvent,
    );
  });

  // Mở ký ức từ nơi khác, hay mục của ngày khác, không phải nhìn lại (BR-GDN-LN-008).
  it('refuses an item that is not on the list, or listed under another kind', async () => {
    for (const command of [
      new OpenOnThisDayItemCommand('owner-id', 'MEMORY', 'other-id', now),
      new OpenOnThisDayItemCommand('owner-id', 'MEMORY', 'journal-id', now),
    ]) {
      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(OnThisDayItemNotFoundException);
    }
    expect(openings.record).not.toHaveBeenCalled();
  });
});
