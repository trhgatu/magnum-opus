import type { OnThisDayReader } from '../../ports/on-this-day-reader.port';
import { GetOnThisDayQuery } from '../get-on-this-day.query';
import { GetOnThisDayHandler } from './get-on-this-day.handler';

describe('GetOnThisDayHandler', () => {
  const createReader = (timeZone: string) =>
    ({
      getTimeZone: jest.fn().mockResolvedValue(timeZone),
      findMemories: jest.fn().mockResolvedValue([
        {
          id: 'memory',
          title: 'Leo Fansipan',
          day: '2023-11-10',
          excerpt: null,
          sourceJournalEntryId: null,
        },
      ]),
      findJournalEntries: jest.fn().mockResolvedValue([]),
    }) as unknown as jest.Mocked<OnThisDayReader>;

  it('takes today in the account time zone, not the server clock', async () => {
    const reader = createReader('Asia/Ho_Chi_Minh');

    // 23:00 ngày 9 ở UTC là 06:00 ngày 10 ở Việt Nam.
    const result = await new GetOnThisDayHandler(reader).execute(
      new GetOnThisDayQuery('owner-id', new Date('2026-11-09T23:00:00Z')),
    );

    expect(reader.findMemories).toHaveBeenCalledWith(
      'owner-id',
      ['11-10'],
      2026,
    );
    expect(reader.findJournalEntries).toHaveBeenCalledWith(
      'owner-id',
      ['11-10'],
      2026,
      'Asia/Ho_Chi_Minh',
    );
    expect(result.unwrap()).toEqual({
      date: '2026-11-10',
      items: [
        expect.objectContaining({ id: 'memory', kind: 'MEMORY', yearsAgo: 3 }),
      ],
    });
  });

  it('stays on the previous day where it is still yesterday', async () => {
    const reader = createReader('America/Los_Angeles');

    const result = await new GetOnThisDayHandler(reader).execute(
      new GetOnThisDayQuery('owner-id', new Date('2026-11-10T05:00:00Z')),
    );

    expect(reader.findMemories).toHaveBeenCalledWith(
      'owner-id',
      ['11-09'],
      2026,
    );
    expect(result.unwrap().date).toBe('2026-11-09');
  });
});
