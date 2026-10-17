import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import {
  OUTBOX_EVENT_TYPES,
  rehydrateDomainEvent,
  serializeDomainEvent,
} from './outbox-event.mapper';
import { ProjectCycleClosedEvent } from '@/contexts/crucible/project/domain/events/project-cycle-closed.event';
import { ProjectCycleEndReason } from '@/contexts/crucible/project/domain/enums';

describe('ProjectCycleClosed outbox event', () => {
  it('round-trips through the outbox', () => {
    const closedAt = new Date('2026-10-12T17:00:00.000Z');
    const event = new ProjectCycleClosedEvent(
      'project-id',
      'owner-id',
      'cycle-id',
      ProjectCycleEndReason.STOPPED,
      closedAt,
    );

    const serialized = serializeDomainEvent(event);
    expect(serialized).toMatchObject({
      id: event.eventId,
      type: OUTBOX_EVENT_TYPES.PROJECT_CYCLE_CLOSED,
      aggregateId: 'project-id',
      payload: {
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleId: 'cycle-id',
        endReason: 'STOPPED',
        closedAt: '2026-10-12T17:00:00.000Z',
      },
    });

    const restored = rehydrateDomainEvent({
      id: serialized.id,
      type: serialized.type,
      payload: serialized.payload,
      occurredAt: serialized.occurredAt,
    }) as ProjectCycleClosedEvent;
    expect(restored).toBeInstanceOf(ProjectCycleClosedEvent);
    expect(restored).toMatchObject({
      projectId: 'project-id',
      ownerId: 'owner-id',
      cycleId: 'cycle-id',
      endReason: ProjectCycleEndReason.STOPPED,
      closedAt,
      eventId: event.eventId,
    });
  });

  it('refuses an unknown end reason', () => {
    expect(() =>
      rehydrateDomainEvent({
        id: 'event-id',
        type: OUTBOX_EVENT_TYPES.PROJECT_CYCLE_CLOSED,
        payload: {
          projectId: 'p',
          ownerId: 'o',
          cycleId: 'c',
          endReason: 'ABANDONED',
          closedAt: '2026-10-12T17:00:00.000Z',
        },
        occurredAt: new Date(),
      }),
    ).toThrow('Unknown cycle end reason "ABANDONED"');
  });
});

describe('outbox event mapper', () => {
  it('round-trips a supported domain event while preserving identity', () => {
    const original = new UserRegisteredEvent(
      'user-id',
      'user@example.com',
      'user',
    );

    const serialized = serializeDomainEvent(original);
    const rehydrated = rehydrateDomainEvent(serialized);

    expect(serialized.type).toBe(OUTBOX_EVENT_TYPES.USER_REGISTERED);
    expect(rehydrated).toBeInstanceOf(UserRegisteredEvent);
    expect(rehydrated.eventId).toBe(original.eventId);
    expect(rehydrated.occurredOn).toEqual(original.occurredOn);
    expect(rehydrated).toEqual(
      expect.objectContaining({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
      }),
    );
  });

  it('rejects unknown event types instead of silently dropping them', () => {
    expect(() =>
      rehydrateDomainEvent({
        id: 'event-id',
        type: 'unknown.event.v1',
        payload: {},
        occurredAt: new Date(),
      }),
    ).toThrow('Unsupported outbox event type');
  });
});
