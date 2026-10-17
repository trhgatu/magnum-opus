import { DeclarationTimeline } from '../declaration-timeline';
import { attributeEvent } from './attribute-event';

const at = (iso: string) => new Date(iso);

/** 02 §3.1: Start 01/10, Pause 06/10 20:00, Resume 10/10, Complete 12/10, Reopen 20/10. */
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
  {
    fromState: 'COMPLETED',
    toState: 'ACTIVE',
    occurredAt: at('2026-10-20T10:00:00Z'),
    cycleId: 'cycle-2',
  },
]);

const attribute = (iso: string) =>
  attributeEvent({ occurredAt: at(iso) }, timeline);

describe('attributeEvent', () => {
  it('puts an event while ACTIVE in the open cycle, labelled ACTIVE', () => {
    expect(attribute('2026-10-03T12:00:00Z')).toEqual({
      inCycle: true,
      cycleId: 'cycle-1',
      label: 'ACTIVE',
    });
  });

  it('keeps an event while PAUSED in the cycle, labelled PAUSED', () => {
    // Đúng lúc Pause: thuộc khoảng PAUSED.
    expect(attribute('2026-10-06T20:00:00Z')).toEqual({
      inCycle: true,
      cycleId: 'cycle-1',
      label: 'PAUSED',
    });
  });

  it('puts an event before Start outside any cycle', () => {
    expect(attribute('2026-09-30T12:00:00Z')).toEqual({
      inCycle: false,
      position: 'BEFORE_START',
    });
  });

  it('puts an event after the cycle closed outside any cycle', () => {
    expect(attribute('2026-10-15T12:00:00Z')).toEqual({
      inCycle: false,
      position: 'AFTER_CLOSE',
    });
  });

  it('attributes the events of one pull request independently', () => {
    // PR #150 mở 11/10 (Cycle 1), merge 21/10 (Cycle 2): không đếm trùng.
    expect(attribute('2026-10-11T09:00:00Z')).toEqual({
      inCycle: true,
      cycleId: 'cycle-1',
      label: 'ACTIVE',
    });
    expect(attribute('2026-10-21T09:00:00Z')).toEqual({
      inCycle: true,
      cycleId: 'cycle-2',
      label: 'ACTIVE',
    });
  });
});
