import type { ActivityEvent } from './activity-evidence';
import {
  clipIntervals,
  codingIntervals,
  latestEnd,
  msByDay,
  splitAtBoundaries,
  totalMs,
  unionIntervals,
} from './coding-time';
import { DeclarationTimeline } from './declaration-timeline';

const ms = (iso: string) => Date.parse(iso);
const MINUTE = 60_000;

const coding = (
  iso: string,
  minutes: number,
  feedId = 'feed-1',
): ActivityEvent => ({
  feedId,
  kind: 'CODING_TIME',
  occurredAt: new Date(iso),
  quantity: minutes * 60,
});

describe('coding time', () => {
  describe('codingIntervals', () => {
    it('turns coding sessions into intervals and ignores point events', () => {
      expect(
        codingIntervals([
          coding('2026-10-02T09:00:00Z', 30),
          {
            feedId: 'feed-1',
            kind: 'COMMIT_AUTHORED',
            occurredAt: new Date('2026-10-02T09:10:00Z'),
            quantity: 1,
          },
        ]),
      ).toEqual([
        { start: ms('2026-10-02T09:00:00Z'), end: ms('2026-10-02T09:30:00Z') },
      ]);
    });

    it('counts time that two sources share only once (BR-PAC-040)', () => {
      const intervals = codingIntervals([
        coding('2026-10-02T09:00:00Z', 60, 'feed-a'),
        coding('2026-10-02T09:30:00Z', 60, 'feed-b'),
      ]);

      expect(intervals).toEqual([
        { start: ms('2026-10-02T09:00:00Z'), end: ms('2026-10-02T10:30:00Z') },
      ]);
      expect(totalMs(intervals)).toBe(90 * MINUTE);
    });

    it('drops the part of a feed before its own cut-off', () => {
      const intervals = codingIntervals(
        [
          coding('2026-10-04T23:50:00Z', 30, 'feed-a'),
          coding('2026-10-04T22:00:00Z', 30, 'feed-b'),
        ],
        new Map([
          ['feed-a', ms('2026-10-05T00:00:00Z')],
          ['feed-b', ms('2026-10-05T00:00:00Z')],
        ]),
      );

      expect(intervals).toEqual([
        { start: ms('2026-10-05T00:00:00Z'), end: ms('2026-10-05T00:20:00Z') },
      ]);
    });
  });

  describe('unionIntervals', () => {
    it('merges touching intervals and keeps gaps', () => {
      expect(
        unionIntervals([
          { start: 30, end: 40 },
          { start: 0, end: 10 },
          { start: 10, end: 20 },
        ]),
      ).toEqual([
        { start: 0, end: 20 },
        { start: 30, end: 40 },
      ]);
    });

    it('does not change its input', () => {
      const input = [
        { start: 0, end: 10 },
        { start: 5, end: 20 },
      ];
      unionIntervals(input);

      expect(input).toEqual([
        { start: 0, end: 10 },
        { start: 5, end: 20 },
      ]);
    });
  });

  it('clips intervals to a window', () => {
    expect(
      clipIntervals(
        [
          { start: 0, end: 10 },
          { start: 20, end: 30 },
          { start: 40, end: 50 },
        ],
        5,
        25,
      ),
    ).toEqual([
      { start: 5, end: 10 },
      { start: 20, end: 25 },
    ]);
  });

  describe('splitAtBoundaries', () => {
    const timeline = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: new Date('2026-10-01T00:00:00Z'),
        cycleId: 'cycle-1',
      },
      {
        fromState: 'ACTIVE',
        toState: 'PAUSED',
        occurredAt: new Date('2026-10-06T14:00:00Z'),
        cycleId: 'cycle-1',
      },
    ]);

    it('cuts a session at a status change (BR-PAC-039)', () => {
      const pieces = splitAtBoundaries(
        [
          {
            start: ms('2026-10-06T13:50:00Z'),
            end: ms('2026-10-06T14:20:00Z'),
          },
        ],
        timeline,
        'UTC',
      );

      expect(
        pieces.map((piece) => ({
          minutes: (piece.end - piece.start) / MINUTE,
          state: piece.segment.state,
        })),
      ).toEqual([
        { minutes: 10, state: 'ACTIVE' },
        { minutes: 20, state: 'PAUSED' },
      ]);
    });

    it('cuts a session at midnight in the account time zone', () => {
      // 23:50 → 00:20 giờ Việt Nam (UTC+7).
      const pieces = splitAtBoundaries(
        [
          {
            start: ms('2026-10-02T16:50:00Z'),
            end: ms('2026-10-02T17:20:00Z'),
          },
        ],
        timeline,
        'Asia/Ho_Chi_Minh',
      );

      expect(
        [...msByDay(pieces)].map(([day, total]) => [day, total / MINUTE]),
      ).toEqual([
        ['2026-10-02', 10],
        ['2026-10-03', 20],
      ]);
    });

    it('leaves a session inside one day and one status whole', () => {
      expect(
        splitAtBoundaries(
          [
            {
              start: ms('2026-10-02T09:00:00Z'),
              end: ms('2026-10-02T10:00:00Z'),
            },
          ],
          timeline,
          'UTC',
        ),
      ).toHaveLength(1);
    });
  });

  it('finds the latest end of a very long history without overflowing', () => {
    const intervals = Array.from({ length: 300_000 }, (_, index) => ({
      start: index,
      end: index + 1,
    }));

    expect(latestEnd(intervals)).toBe(300_000);
  });

  it('finds the latest end, or none', () => {
    expect(
      latestEnd([
        { start: 0, end: 10 },
        { start: 5, end: 30 },
      ]),
    ).toBe(30);
    expect(latestEnd([])).toBeNull();
  });
});
