import type {
  ActivityEvent,
  ActivityEventKind,
  SourceCoverage,
} from '../activity-evidence';
import {
  DeclarationTimeline,
  type LifecycleTransition,
} from '../declaration-timeline';
import { summarizeCycleActivity } from './summarize-cycle-activity';

const at = (iso: string) => new Date(iso);

const event = (
  iso: string,
  kind: ActivityEventKind = 'COMMIT_AUTHORED',
): ActivityEvent => ({
  feedId: 'feed-1',
  kind,
  occurredAt: at(iso),
  quantity: 1,
});

const source = (
  coveredFrom: string | null,
  syncedUntil: string | null,
  status: SourceCoverage['status'] = 'ACTIVE',
): SourceCoverage => ({
  status,
  coveredFrom: coveredFrom ? at(coveredFrom) : null,
  syncedUntil: syncedUntil ? at(syncedUntil) : null,
});

/** 02 §3.1, Cycle 1: Start 01/10 09:00, Pause 06/10 20:00, Resume 10/10 08:00, Complete 12/10 17:00. */
const cycleOne: LifecycleTransition[] = [
  {
    fromState: 'NOT_STARTED',
    toState: 'ACTIVE',
    occurredAt: at('2026-10-01T09:00:00Z'),
    cycleId: 'cycle-1',
  },
  {
    fromState: 'ACTIVE',
    toState: 'PAUSED',
    occurredAt: at('2026-10-06T20:00:00Z'),
    cycleId: 'cycle-1',
  },
  {
    fromState: 'PAUSED',
    toState: 'ACTIVE',
    occurredAt: at('2026-10-10T08:00:00Z'),
    cycleId: 'cycle-1',
  },
  {
    fromState: 'ACTIVE',
    toState: 'COMPLETED',
    occurredAt: at('2026-10-12T17:00:00Z'),
    cycleId: 'cycle-1',
  },
];

describe('summarizeCycleActivity', () => {
  const timeline = DeclarationTimeline.fromTransitions(cycleOne);

  const summarize = (
    events: ActivityEvent[],
    sources: SourceCoverage[] = [
      source('2026-09-24T00:00:00Z', '2026-10-25T00:00:00Z'),
    ],
    overrides: { timeZone?: string; until?: Date } = {},
  ) =>
    summarizeCycleActivity({
      cycleId: 'cycle-1',
      timeline,
      events,
      sources,
      timeZone: overrides.timeZone ?? 'UTC',
      until: overrides.until ?? at('2026-10-25T00:00:00Z'),
    });

  it('gives each day of the cycle one state and derives the metrics', () => {
    const summary = summarize([
      event('2026-10-01T10:00:00Z'),
      // Ngày Pause: có event lúc ACTIVE (15:00) và lúc PAUSED (21:00) → ACTIVE.
      event('2026-10-06T15:00:00Z'),
      event('2026-10-06T21:00:00Z'),
      event('2026-10-08T12:00:00Z'),
      event('2026-10-11T09:00:00Z', 'PR_OPENED'),
      // Sau khi khép: ngoài Cycle.
      event('2026-10-13T09:00:00Z'),
      // Trước khi bắt đầu: ngoài Cycle.
      event('2026-09-30T09:00:00Z'),
    ]);

    expect(summary.days).toEqual([
      { date: '2026-10-01', state: 'ACTIVE' },
      { date: '2026-10-02', state: 'IDLE' },
      { date: '2026-10-03', state: 'IDLE' },
      { date: '2026-10-04', state: 'IDLE' },
      { date: '2026-10-05', state: 'IDLE' },
      { date: '2026-10-06', state: 'ACTIVE' },
      // Nằm trọn trong khoảng tạm dừng, không có event.
      { date: '2026-10-07', state: 'PAUSED_IDLE' },
      // Mọi event đều lúc tạm dừng.
      { date: '2026-10-08', state: 'PAUSED_ACTIVE' },
      { date: '2026-10-09', state: 'PAUSED_IDLE' },
      // Resume 08:00: không nằm trọn trong khoảng tạm dừng.
      { date: '2026-10-10', state: 'IDLE' },
      { date: '2026-10-11', state: 'ACTIVE' },
      // Ngày khép (17:00) là ngày cuối của Cycle.
      { date: '2026-10-12', state: 'IDLE' },
    ]);
    expect(summary.metrics).toEqual({
      activeDays: 4,
      pausedActiveDays: 1,
      commits: 4,
      prsOpened: 1,
      prsMerged: 0,
    });
    expect(summary.lastActivityAt).toEqual(at('2026-10-11T09:00:00Z'));
    expect(summary.hasMissingData).toBe(false);
    expect(summary.dataUntil).toEqual(at('2026-10-25T00:00:00Z'));
  });

  it('marks days no source has copied as NO_DATA, never IDLE', () => {
    const summary = summarize(
      [event('2026-10-06T15:00:00Z')],
      [source('2026-10-05T00:00:00Z', '2026-10-25T00:00:00Z')],
    );

    expect(summary.days.slice(0, 5).map((day) => day.state)).toEqual([
      'NO_DATA',
      'NO_DATA',
      'NO_DATA',
      'NO_DATA',
      'IDLE',
    ]);
    expect(summary.hasMissingData).toBe(true);
  });

  it('counts a day if any one source has copied it', () => {
    const summary = summarize(
      [],
      [
        source('2026-10-05T00:00:00Z', '2026-10-25T00:00:00Z'),
        source('2026-09-24T00:00:00Z', '2026-10-25T00:00:00Z'),
      ],
    );

    expect(summary.days.every((day) => day.state !== 'NO_DATA')).toBe(true);
    // Nguồn thứ nhất chưa phủ trọn Cycle.
    expect(summary.hasMissingData).toBe(true);
  });

  it('marks days after the last copy as NO_DATA', () => {
    const summary = summarize(
      [],
      [source('2026-09-24T00:00:00Z', '2026-10-09T12:00:00Z')],
    );

    // 09/10 đã chép từ đầu ngày; 10/10 trở đi chưa.
    expect(
      summary.days
        .filter((day) => day.date >= '2026-10-09')
        .map((day) => day.state),
    ).toEqual(['PAUSED_IDLE', 'NO_DATA', 'NO_DATA', 'NO_DATA']);
    expect(summary.dataUntil).toEqual(at('2026-10-09T12:00:00Z'));
  });

  it('reports missing data when a closed cycle was not copied up to its close', () => {
    // Khép 12/10 17:00; nguồn chỉ chép tới 12/10 12:00 — cùng ngày, nên
    // không ngày nào NO_DATA, nhưng dữ liệu vẫn thiếu.
    const summary = summarize(
      [],
      [source('2026-09-24T00:00:00Z', '2026-10-12T12:00:00Z')],
    );

    expect(summary.days.every((day) => day.state !== 'NO_DATA')).toBe(true);
    expect(summary.hasMissingData).toBe(true);
  });

  it('reports missing data when a source is in error or never copied', () => {
    expect(
      summarize(
        [],
        [source('2026-09-24T00:00:00Z', '2026-10-25T00:00:00Z', 'ERROR')],
      ).hasMissingData,
    ).toBe(true);

    const neverCopied = summarize([], [source(null, null, 'DISCONNECTED')]);
    expect(neverCopied.hasMissingData).toBe(true);
    expect(neverCopied.dataUntil).toBeNull();
    expect(neverCopied.days.every((day) => day.state === 'NO_DATA')).toBe(true);
  });

  it('splits days in the account time zone', () => {
    // 01/10 18:00Z là 02/10 01:00 ở Việt Nam.
    const summary = summarize([event('2026-10-01T18:00:00Z')], undefined, {
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    expect(summary.days.slice(0, 2)).toEqual([
      { date: '2026-10-01', state: 'IDLE' },
      { date: '2026-10-02', state: 'ACTIVE' },
    ]);
  });

  it('leaves out a date the account time zone skipped', () => {
    // Samoa bỏ 30/12/2011 (UTC−10 → UTC+14 lúc 30/12 10:00Z): Cycle mở
    // 29/12 02:00 giờ địa phương, xét tới 31/12 02:00 — chỉ có hai ngày.
    const samoa = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: at('2011-12-29T12:00:00Z'),
        cycleId: 'cycle-1',
      },
    ]);
    const summary = summarizeCycleActivity({
      cycleId: 'cycle-1',
      timeline: samoa,
      events: [],
      sources: [source('2011-12-01T00:00:00Z', '2012-01-01T00:00:00Z')],
      timeZone: 'Pacific/Apia',
      until: at('2011-12-30T12:00:00Z'),
    });

    expect(summary.days.map((day) => day.date)).toEqual([
      '2011-12-29',
      '2011-12-31',
    ]);
  });

  it('runs an open cycle up to now, including today', () => {
    const open = DeclarationTimeline.fromTransitions(cycleOne.slice(0, 1));
    const summary = summarizeCycleActivity({
      cycleId: 'cycle-1',
      timeline: open,
      events: [
        event('2026-10-03T08:00:00Z'),
        // Author date ở tương lai (đồng hồ lệch): không tính.
        event('2026-10-04T08:00:00Z'),
      ],
      sources: [source('2026-09-24T00:00:00Z', '2026-10-03T11:50:00Z')],
      timeZone: 'UTC',
      until: at('2026-10-03T12:00:00Z'),
    });

    expect(summary.days.map((day) => day.date)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
    expect(summary.days[2].state).toBe('ACTIVE');
    expect(summary.metrics.commits).toBe(1);
  });

  it('refuses a cycle that is not on the timeline', () => {
    expect(() =>
      summarizeCycleActivity({
        cycleId: 'unknown',
        timeline,
        events: [],
        sources: [],
        timeZone: 'UTC',
        until: at('2026-10-25T00:00:00Z'),
      }),
    ).toThrow('Cycle unknown is not on the timeline');
  });

  describe('coding time (08 §4.4–4.7)', () => {
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

    const summarizeCoding = (events: ActivityEvent[], codingMeasured = true) =>
      summarizeCycleActivity({
        cycleId: 'cycle-1',
        timeline,
        events,
        sources: [source('2026-09-24T00:00:00Z', '2026-10-25T00:00:00Z')],
        timeZone: 'UTC',
        until: at('2026-10-25T00:00:00Z'),
        codingMeasured,
      });

    const stateOf = (
      summary: ReturnType<typeof summarizeCoding>,
      date: string,
    ) => summary.days.find((day) => day.date === date)?.state;

    it('makes a day active from 15 minutes of coding, without any commit', () => {
      const summary = summarizeCoding([
        coding('2026-10-02T10:00:00Z', 20),
        coding('2026-10-03T10:00:00Z', 10),
      ]);

      expect(stateOf(summary, '2026-10-02')).toBe('ACTIVE');
      expect(stateOf(summary, '2026-10-03')).toBe('IDLE');
      expect(summary.metrics.activeDays).toBe(1);
      expect(summary.coding?.secondsByDay['2026-10-02']).toBe(1200);
      expect(summary.coding?.secondsByDay['2026-10-03']).toBe(600);
      expect(summary.coding?.secondsByDay['2026-10-04']).toBe(0);
      expect(summary.coding?.totalSeconds).toBe(1800);
    });

    it('splits a session at Pause: active if any of it was while active', () => {
      // Pause lúc 06/10 20:00: 10 phút ACTIVE, 20 phút PAUSED.
      const summary = summarizeCoding([
        coding('2026-10-06T19:50:00Z', 30),
        coding('2026-10-08T10:00:00Z', 20),
      ]);

      expect(stateOf(summary, '2026-10-06')).toBe('ACTIVE');
      expect(stateOf(summary, '2026-10-08')).toBe('PAUSED_ACTIVE');
      expect(summary.metrics.pausedActiveDays).toBe(1);
    });

    it('splits a session at midnight before applying the threshold', () => {
      // 20 phút vắt qua nửa đêm: 10 phút mỗi ngày, không ngày nào đủ ngưỡng.
      const summary = summarizeCoding([coding('2026-10-02T23:50:00Z', 20)]);

      expect(stateOf(summary, '2026-10-02')).toBe('IDLE');
      expect(stateOf(summary, '2026-10-03')).toBe('IDLE');
      expect(summary.coding?.totalSeconds).toBe(1200);
    });

    it('counts time two sources share only once', () => {
      const summary = summarizeCoding([
        coding('2026-10-02T09:00:00Z', 60, 'feed-a'),
        coding('2026-10-02T09:30:00Z', 60, 'feed-b'),
      ]);

      expect(summary.coding?.totalSeconds).toBe(90 * 60);
    });

    it('keeps only the part inside the cycle', () => {
      // Start 01/10 09:00, Complete 12/10 17:00: mỗi đoạn chỉ còn 30 phút.
      const summary = summarizeCoding([
        coding('2026-10-01T08:30:00Z', 60),
        coding('2026-10-12T16:30:00Z', 60),
      ]);

      expect(summary.coding?.totalSeconds).toBe(60 * 60);
    });

    it('takes the end of the latest session as the last activity', () => {
      const summary = summarizeCoding([
        event('2026-10-11T09:00:00Z'),
        coding('2026-10-11T10:00:00Z', 30),
      ]);

      expect(summary.lastActivityAt).toEqual(at('2026-10-11T10:30:00Z'));
      expect(summary.metrics.commits).toBe(1);
    });

    it('reports no coding time when the project does not measure it', () => {
      expect(
        summarizeCoding([coding('2026-10-02T10:00:00Z', 20)], false).coding,
      ).toBeNull();
    });
  });
});
