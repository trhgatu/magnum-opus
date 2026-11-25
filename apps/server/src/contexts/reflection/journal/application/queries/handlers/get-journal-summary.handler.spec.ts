import { GetJournalSummaryQuery } from '../get-journal-summary.query';
import { GetJournalSummaryHandler } from './get-journal-summary.handler';

describe('GetJournalSummaryHandler', () => {
  it("counts the owner's written days in the last seven", async () => {
    const listReader = {
      extrasFor: jest.fn(),
      writtenDaysLast7: jest.fn().mockResolvedValue(5),
    };
    const now = new Date('2026-11-25T03:00:00.000Z');

    await expect(
      new GetJournalSummaryHandler(listReader).execute(
        new GetJournalSummaryQuery('owner-1', now),
      ),
    ).resolves.toEqual({ writtenDaysLast7: 5 });
    expect(listReader.writtenDaysLast7).toHaveBeenCalledWith('owner-1', now);
  });
});
