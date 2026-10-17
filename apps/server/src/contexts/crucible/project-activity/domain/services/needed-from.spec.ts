import { DeclarationTimeline } from '../declaration-timeline';
import { neededFrom } from './needed-from';

const at = (iso: string) => new Date(iso);
const linkedAt = at('2026-10-15T00:00:00Z');

describe('neededFrom', () => {
  it('reaches back to when the open cycle started', () => {
    const timeline = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: at('2026-10-01T09:00:00Z'),
        cycleId: 'cycle-1',
      },
      {
        fromState: 'ACTIVE',
        toState: 'PAUSED',
        occurredAt: at('2026-10-05T00:00:00Z'),
        cycleId: 'cycle-1',
      },
    ]);

    expect(neededFrom(timeline, linkedAt)).toEqual(at('2026-10-01T09:00:00Z'));
  });

  it('reaches back to the last close of a closed project', () => {
    const timeline = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: at('2026-10-01T09:00:00Z'),
        cycleId: 'cycle-1',
      },
      {
        fromState: 'ACTIVE',
        toState: 'COMPLETED',
        occurredAt: at('2026-10-10T00:00:00Z'),
        cycleId: 'cycle-1',
      },
    ]);

    expect(neededFrom(timeline, linkedAt)).toEqual(at('2026-10-10T00:00:00Z'));
  });

  it('reaches back to the reopened cycle, not the earlier one or its close', () => {
    const timeline = DeclarationTimeline.fromTransitions([
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: at('2026-09-01T09:00:00Z'),
        cycleId: 'cycle-1',
      },
      {
        fromState: 'ACTIVE',
        toState: 'COMPLETED',
        occurredAt: at('2026-09-20T00:00:00Z'),
        cycleId: 'cycle-1',
      },
      {
        fromState: 'COMPLETED',
        toState: 'ACTIVE',
        occurredAt: at('2026-10-05T08:00:00Z'),
        cycleId: 'cycle-2',
      },
    ]);

    expect(neededFrom(timeline, linkedAt)).toEqual(at('2026-10-05T08:00:00Z'));
  });

  it('starts at the link time for a project that never had a cycle', () => {
    expect(
      neededFrom(DeclarationTimeline.fromTransitions([]), linkedAt),
    ).toEqual(linkedAt);
    expect(
      neededFrom(
        DeclarationTimeline.fromTransitions([
          {
            fromState: 'NOT_STARTED',
            toState: 'STOPPED',
            occurredAt: at('2026-10-02T00:00:00Z'),
            cycleId: null,
          },
        ]),
        linkedAt,
      ),
    ).toEqual(linkedAt);
  });
});
