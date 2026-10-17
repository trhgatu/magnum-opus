import {
  DeclarationTimeline,
  type LifecycleTransition,
} from './declaration-timeline';

const at = (iso: string) => new Date(iso);

/** Ví dụ của 02 §3.1. */
const transitions: LifecycleTransition[] = [
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
    cycleId: null,
  },
  {
    fromState: 'ACTIVE',
    toState: 'COMPLETED',
    occurredAt: at('2026-10-12T17:00:00Z'),
    cycleId: 'cycle-1',
  },
  {
    fromState: 'COMPLETED',
    toState: 'ACTIVE',
    occurredAt: at('2026-10-20T10:00:00Z'),
    cycleId: 'cycle-2',
  },
];

describe('DeclarationTimeline', () => {
  // Đưa vào lộn thứ tự: dòng thời gian tự sắp theo occurredAt.
  const timeline = DeclarationTimeline.fromTransitions(
    [...transitions].reverse(),
  );

  it('builds one continuous run of declarations with their cycle', () => {
    expect(
      timeline.segments.map(({ state, cycleId }) => ({ state, cycleId })),
    ).toEqual([
      { state: 'NOT_STARTED', cycleId: null },
      { state: 'ACTIVE', cycleId: 'cycle-1' },
      { state: 'PAUSED', cycleId: 'cycle-1' },
      // Resume không mang cycleId: vẫn là Cycle đang mở.
      { state: 'ACTIVE', cycleId: 'cycle-1' },
      { state: 'COMPLETED', cycleId: null },
      { state: 'ACTIVE', cycleId: 'cycle-2' },
    ]);
    expect(timeline.segments[0].from).toBeNull();
    expect(timeline.segments[5].to).toBeNull();
  });

  it('puts an instant exactly at a transition in the new segment', () => {
    expect(timeline.segmentAt(at('2026-10-06T20:00:00Z')).state).toBe('PAUSED');
    expect(timeline.segmentAt(at('2026-10-06T19:59:59Z')).state).toBe('ACTIVE');
    expect(timeline.segmentAt(at('2026-09-01T00:00:00Z')).state).toBe(
      'NOT_STARTED',
    );
    expect(timeline.segmentAt(at('2026-12-01T00:00:00Z')).cycleId).toBe(
      'cycle-2',
    );
  });

  it('knows the current declaration and cycle', () => {
    expect(timeline.currentState).toBe('ACTIVE');
    expect(timeline.currentCycleId).toBe('cycle-2');
  });

  it('starts NOT_STARTED with no cycle before any transition', () => {
    const fresh = DeclarationTimeline.fromTransitions([]);

    expect(fresh.currentState).toBe('NOT_STARTED');
    expect(fresh.currentCycleId).toBeNull();
    expect(fresh.lastCycleClose()).toBeNull();
  });

  it('finds the last entry into a state', () => {
    expect(timeline.lastEntryInto(['ACTIVE'])).toEqual(
      at('2026-10-20T10:00:00Z'),
    );
    expect(timeline.lastEntryInto(['PAUSED'])).toEqual(
      at('2026-10-06T20:00:00Z'),
    );
    expect(timeline.lastEntryInto(['STOPPED'])).toBeNull();
  });

  it('finds the last real cycle close, not a stop before starting', () => {
    expect(timeline.lastCycleClose()).toEqual(at('2026-10-12T17:00:00Z'));

    const stoppedBeforeStart = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'STOPPED',
        occurredAt: at('2026-10-01T00:00:00Z'),
        cycleId: null,
      },
    ]);
    expect(stoppedBeforeStart.lastCycleClose()).toBeNull();
  });

  it('lists the segments of a cycle', () => {
    expect(
      timeline.segmentsOfCycle('cycle-1').map((segment) => segment.state),
    ).toEqual(['ACTIVE', 'PAUSED', 'ACTIVE']);
  });
});
