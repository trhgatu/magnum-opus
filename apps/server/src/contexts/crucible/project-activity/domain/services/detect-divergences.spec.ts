import type {
  ActivityEvent,
  ActivityEventKind,
  LinkedSource,
} from '../activity-evidence';
import {
  DeclarationTimeline,
  type LifecycleTransition,
} from '../declaration-timeline';
import { detectDivergences } from './detect-divergences';

const at = (iso: string) => new Date(iso);

const event = (
  iso: string,
  kind: ActivityEventKind = 'COMMIT_AUTHORED',
  feedId = 'feed-1',
): ActivityEvent => ({ feedId, kind, occurredAt: at(iso), quantity: 1 });

const source = (overrides: Partial<LinkedSource> = {}): LinkedSource => ({
  feedId: 'feed-1',
  linkedAt: at('2026-09-01T00:00:00Z'),
  status: 'ACTIVE',
  coveredFrom: at('2026-09-01T00:00:00Z'),
  syncedUntil: at('2026-10-20T00:00:00Z'),
  ...overrides,
});

const transition = (
  fromState: LifecycleTransition['fromState'],
  toState: LifecycleTransition['toState'],
  iso: string,
): LifecycleTransition => ({
  fromState,
  toState,
  occurredAt: at(iso),
  cycleId: toState === 'ACTIVE' && fromState !== 'PAUSED' ? 'cycle-1' : null,
});

const started = transition('NOT_STARTED', 'ACTIVE', '2026-10-01T00:00:00Z');

const detect = (
  transitions: LifecycleTransition[],
  events: ActivityEvent[],
  sources: LinkedSource[] = [source()],
  now = at('2026-10-20T00:00:00Z'),
  timeZone = 'UTC',
) =>
  detectDivergences({
    timeline: DeclarationTimeline.fromTransitions(transitions),
    events,
    sources,
    timeZone,
    now,
  });

describe('detectDivergences', () => {
  it('finds nothing to compare without a source', () => {
    expect(detect([started], [], [])).toEqual([]);
  });

  describe('D1 — declared active, no activity', () => {
    it('appears after 7 days without events since Start', () => {
      expect(
        detect(
          [started],
          [],
          [source({ syncedUntil: at('2026-10-09T00:00:00Z') })],
        ),
      ).toEqual([{ kind: 'ACTIVE_WITHOUT_ACTIVITY', idleDays: 8 }]);
    });

    it('appears on the seventh idle day, not later', () => {
      expect(
        detect(
          [started],
          [],
          [source({ syncedUntil: at('2026-10-08T00:00:00Z') })],
        ),
      ).toEqual([{ kind: 'ACTIVE_WITHOUT_ACTIVITY', idleDays: 7 }]);
      expect(
        detect(
          [started],
          [],
          [source({ syncedUntil: at('2026-10-07T23:59:59Z') })],
        ),
      ).toEqual([]);
    });

    it('counts from the latest event of the cycle', () => {
      expect(
        detect(
          [started],
          [event('2026-10-05T00:00:00Z')],
          [source({ syncedUntil: at('2026-10-09T00:00:00Z') })],
        ),
      ).toEqual([]);
    });

    it('counts from the last Resume, so resuming is not nagged at once', () => {
      expect(
        detect(
          [
            started,
            transition('ACTIVE', 'PAUSED', '2026-10-02T00:00:00Z'),
            transition('PAUSED', 'ACTIVE', '2026-10-15T00:00:00Z'),
          ],
          [],
        ),
      ).toEqual([]);
    });

    it('is not judged while a source cannot be read', () => {
      expect(detect([started], [], [source({ status: 'ERROR' })])).toEqual([]);
    });

    it('is not judged when the span to look at was never copied', () => {
      expect(
        detect(
          [started],
          [],
          [source({ coveredFrom: at('2026-10-10T00:00:00Z') })],
        ),
      ).toEqual([]);
    });

    it('measures idle time only up to what has been copied', () => {
      // Chép tới 06/10: mới 5 ngày được biết là không có gì.
      expect(
        detect(
          [started],
          [],
          [source({ syncedUntil: at('2026-10-06T00:00:00Z') })],
        ),
      ).toEqual([]);
    });
  });

  describe('D2 — declared paused, still active', () => {
    const paused = [
      started,
      transition('ACTIVE', 'PAUSED', '2026-10-05T00:00:00Z'),
    ];

    it('appears with events on 2 different days of the current pause', () => {
      expect(
        detect(paused, [
          event('2026-10-06T10:00:00Z'),
          event('2026-10-07T10:00:00Z'),
        ]),
      ).toEqual([{ kind: 'PAUSED_WITH_ACTIVITY', activeDays: 2 }]);
    });

    it('counts days, not commits — one late fix is one day', () => {
      expect(
        detect(paused, [
          event('2026-10-06T20:00:00Z'),
          event('2026-10-06T21:00:00Z'),
          event('2026-10-06T22:00:00Z'),
        ]),
      ).toEqual([]);
    });

    it('groups events by day in the account time zone', () => {
      // 06/10 17:30Z và 07/10 01:00Z khác ngày UTC nhưng cùng 07/10 ở Việt Nam.
      const sameLocalDay = [
        event('2026-10-06T17:30:00Z'),
        event('2026-10-07T01:00:00Z'),
      ];

      expect(
        detect(paused, sameLocalDay, undefined, undefined, 'Asia/Ho_Chi_Minh'),
      ).toEqual([]);
      expect(detect(paused, sameLocalDay)).toEqual([
        { kind: 'PAUSED_WITH_ACTIVITY', activeDays: 2 },
      ]);
    });

    it('ignores events from before the pause', () => {
      expect(
        detect(paused, [
          event('2026-10-04T10:00:00Z'),
          event('2026-10-06T10:00:00Z'),
        ]),
      ).toEqual([]);
    });
  });

  describe('D3 — closed, still active', () => {
    it('reports events since the last cycle closed', () => {
      expect(
        detect(
          [started, transition('ACTIVE', 'COMPLETED', '2026-10-10T00:00:00Z')],
          [
            event('2026-10-09T00:00:00Z'),
            event('2026-10-11T00:00:00Z'),
            event('2026-10-12T00:00:00Z', 'PR_MERGED'),
          ],
        ),
      ).toEqual([
        {
          kind: 'ACTIVITY_AFTER_CLOSE',
          closedAs: 'COMPLETED',
          commits: 1,
          otherEvents: 1,
          // Project không đo thời gian code.
          codingSeconds: null,
          lastActivityAt: at('2026-10-12T00:00:00Z'),
        },
      ]);
    });

    it('says STOPPED for a stopped project', () => {
      expect(
        detect(
          [started, transition('ACTIVE', 'STOPPED', '2026-10-10T00:00:00Z')],
          [event('2026-10-11T00:00:00Z')],
        ),
      ).toMatchObject([{ closedAs: 'STOPPED' }]);
    });

    it('has nothing to say for a project stopped before it started', () => {
      expect(
        detect(
          [transition('NOT_STARTED', 'STOPPED', '2026-10-10T00:00:00Z')],
          [event('2026-10-11T00:00:00Z')],
        ),
      ).toEqual([]);
    });
  });

  describe('D4 — not started, already active', () => {
    it('appears for events after the source was linked', () => {
      expect(
        detect(
          [],
          [event('2026-10-06T00:00:00Z'), event('2026-10-07T00:00:00Z')],
          [source({ linkedAt: at('2026-10-05T00:00:00Z') })],
        ),
      ).toEqual([
        {
          kind: 'ACTIVITY_BEFORE_START',
          lastActivityAt: at('2026-10-07T00:00:00Z'),
        },
      ]);
    });

    it('ignores the repository history from before it was linked', () => {
      expect(
        detect(
          [],
          [event('2026-10-01T00:00:00Z')],
          [source({ linkedAt: at('2026-10-05T00:00:00Z') })],
        ),
      ).toEqual([]);
    });

    it('judges each source by its own link time', () => {
      expect(
        detect(
          [],
          [
            // feed-1 gắn 05/10: 06/10 tính. feed-2 gắn 10/10: 08/10 không.
            event('2026-10-08T00:00:00Z', 'COMMIT_AUTHORED', 'feed-2'),
            event('2026-10-06T00:00:00Z', 'COMMIT_AUTHORED', 'feed-1'),
          ],
          [
            source({ feedId: 'feed-1', linkedAt: at('2026-10-05T00:00:00Z') }),
            source({ feedId: 'feed-2', linkedAt: at('2026-10-10T00:00:00Z') }),
          ],
        ),
      ).toEqual([
        {
          kind: 'ACTIVITY_BEFORE_START',
          lastActivityAt: at('2026-10-06T00:00:00Z'),
        },
      ]);
    });
  });

  it('ignores events of feeds no longer linked and events dated in the future', () => {
    expect(
      detect(
        [],
        [
          event('2026-10-06T00:00:00Z', 'COMMIT_AUTHORED', 'unlinked-feed'),
          event('2026-12-01T00:00:00Z'),
        ],
      ),
    ).toEqual([]);
  });

  describe('coding time (08 §4.8)', () => {
    const coding = (
      iso: string,
      minutes: number,
      feedId = 'feed-1',
    ): ActivityEvent => ({
      feedId,
      kind: 'CODING_TIME',
      occurredAt: at(iso),
      quantity: minutes * 60,
    });

    const detectCoding = (
      transitions: LifecycleTransition[],
      events: ActivityEvent[],
      sources: LinkedSource[] = [source()],
    ) =>
      detectDivergences({
        timeline: DeclarationTimeline.fromTransitions(transitions),
        events,
        sources,
        timeZone: 'UTC',
        now: at('2026-10-20T00:00:00Z'),
        codingMeasured: true,
      });

    it('D1: a day with 15 minutes of coding counts as activity', () => {
      expect(
        detectCoding([started], [coding('2026-10-15T10:00:00Z', 20)]),
      ).toEqual([]);
    });

    it('D1: a few minutes in the editor do not', () => {
      expect(
        detectCoding([started], [coding('2026-10-15T10:00:00Z', 5)]),
      ).toEqual([{ kind: 'ACTIVE_WITHOUT_ACTIVITY', idleDays: 19 }]);
    });

    it('D2: counts paused days with enough coding', () => {
      const paused = [
        started,
        transition('ACTIVE', 'PAUSED', '2026-10-10T00:00:00Z'),
      ];

      expect(
        detectCoding(paused, [
          coding('2026-10-12T10:00:00Z', 20),
          coding('2026-10-13T10:00:00Z', 20),
        ]),
      ).toEqual([{ kind: 'PAUSED_WITH_ACTIVITY', activeDays: 2 }]);
      expect(
        detectCoding(paused, [
          coding('2026-10-12T10:00:00Z', 10),
          coding('2026-10-13T10:00:00Z', 10),
        ]),
      ).toEqual([]);
    });

    describe('D3', () => {
      const completed = [
        started,
        transition('ACTIVE', 'COMPLETED', '2026-10-10T00:00:00Z'),
      ];

      it('reports coding after close, with its duration', () => {
        expect(
          detectCoding(completed, [coding('2026-10-12T00:00:00Z', 30)]),
        ).toEqual([
          {
            kind: 'ACTIVITY_AFTER_CLOSE',
            closedAs: 'COMPLETED',
            commits: 0,
            otherEvents: 0,
            codingSeconds: 1800,
            lastActivityAt: at('2026-10-12T00:30:00Z'),
          },
        ]);
      });

      it('ignores less than 15 minutes of coding after close', () => {
        expect(
          detectCoding(completed, [coding('2026-10-12T00:00:00Z', 10)]),
        ).toEqual([]);
      });

      it('only counts the part after the close', () => {
        // 23:50 → 00:20: chỉ 20 phút sau lúc khép.
        expect(
          detectCoding(completed, [coding('2026-10-09T23:50:00Z', 30)]),
        ).toEqual([
          expect.objectContaining({
            codingSeconds: 1200,
            lastActivityAt: at('2026-10-10T00:20:00Z'),
          }),
        ]);
      });
    });

    describe('D4', () => {
      const linkedOnFifth = [source({ linkedAt: at('2026-10-05T00:00:00Z') })];

      it('counts coding after the source was linked, cut at the link', () => {
        expect(
          detectCoding([], [coding('2026-10-04T23:50:00Z', 30)], linkedOnFifth),
        ).toEqual([
          {
            kind: 'ACTIVITY_BEFORE_START',
            lastActivityAt: at('2026-10-05T00:20:00Z'),
          },
        ]);
      });

      it('ignores coding from before the source was linked', () => {
        expect(
          detectCoding([], [coding('2026-10-03T10:00:00Z', 60)], linkedOnFifth),
        ).toEqual([]);
      });
    });
  });
});
