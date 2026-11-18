import { UsersOutbox } from '@iam/users/infrastructure/outbox/users.outbox';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { NotificationsOutbox } from '@/contexts/notifications/infrastructure/outbox/notifications.outbox';
import { NotificationCreatedEvent } from '@/contexts/notifications/domain/events/notification-created.event';
import { JournalOutbox } from '@reflection/journal/infrastructure/outbox/journal.outbox';
import { JournalEntrySealedEvent } from '@reflection/journal/domain/events/journal-entry-sealed.event';
import { MemoryOutbox } from '@reflection/memory/infrastructure/outbox/memory.outbox';
import { MemoryCreatedEvent } from '@reflection/memory/domain/events/memory-created.event';
import { ProjectOutbox } from '@/contexts/crucible/project/infrastructure/outbox/project.outbox';
import { ProjectCycleClosedEvent } from '@/contexts/crucible/project/domain/events/project-cycle-closed.event';
import { ProjectCycleEndReason } from '@/contexts/crucible/project/domain/enums';
import { HabitOutbox } from '@/contexts/forge/habit/infrastructure/outbox/habit.outbox';
import {
  HabitCreatedEvent,
  HabitPermanentlyDeletedEvent,
} from '@/contexts/forge/habit/domain/events';
import { HabitType } from '@/contexts/forge/habit/domain/enums';
import { HabitCalendarDate } from '@/contexts/forge/habit/domain/value-objects';
import { DomainEvent } from '@shared/domain/events/domain-event';

import type { OutboxPublication } from './outbox-publication';
import { OutboxPublisher } from './outbox.decorators';

const at = new Date('2026-11-16T03:00:00.000Z');

interface PublicationCase {
  name: string;
  publisher: object;
  event: DomainEvent;
  type: string;
  aggregateId: string;
  parsed: unknown;
}

// Chuỗi type đã nằm trong DB: test khóa từng chuỗi để không ai đổi nhầm.
const cases: PublicationCase[] = [
  {
    name: 'UserRegistered',
    publisher: UsersOutbox,
    event: new UserRegisteredEvent('user-id', 'user@example.com', 'user'),
    type: 'iam.user.registered.v1',
    aggregateId: 'user-id',
    parsed: { userId: 'user-id', email: 'user@example.com', username: 'user' },
  },
  {
    name: 'UserDeactivated',
    publisher: UsersOutbox,
    event: new UserDeactivatedEvent('user-id', 'user@example.com'),
    type: 'iam.user.deactivated.v1',
    aggregateId: 'user-id',
    parsed: { userId: 'user-id', email: 'user@example.com' },
  },
  {
    name: 'NotificationCreated',
    publisher: NotificationsOutbox,
    event: new NotificationCreatedEvent(
      'notification-id',
      'user-id',
      'Title',
      'Content',
      'INFO',
      false,
      at,
    ),
    type: 'notifications.notification.created.v1',
    aggregateId: 'notification-id',
    parsed: {
      id: 'notification-id',
      userId: 'user-id',
      title: 'Title',
      content: 'Content',
      type: 'INFO',
      isRead: false,
      createdAt: at,
    },
  },
  {
    name: 'JournalEntrySealed',
    publisher: JournalOutbox,
    event: new JournalEntrySealedEvent('entry-id', 'owner-id', at),
    type: 'reflection.journal-entry.sealed.v1',
    aggregateId: 'entry-id',
    parsed: { journalEntryId: 'entry-id', ownerId: 'owner-id', sealedAt: at },
  },
  {
    name: 'MemoryCreated with a date',
    publisher: MemoryOutbox,
    event: new MemoryCreatedEvent('memory-id', 'owner-id', at),
    type: 'reflection.memory.created.v1',
    aggregateId: 'memory-id',
    parsed: {
      memoryId: 'memory-id',
      ownerId: 'owner-id',
      memoryOccurredOn: at,
    },
  },
  {
    name: 'MemoryCreated without a date',
    publisher: MemoryOutbox,
    event: new MemoryCreatedEvent('memory-id', 'owner-id', null),
    type: 'reflection.memory.created.v1',
    aggregateId: 'memory-id',
    parsed: {
      memoryId: 'memory-id',
      ownerId: 'owner-id',
      memoryOccurredOn: null,
    },
  },
  {
    name: 'ProjectCycleClosed',
    publisher: ProjectOutbox,
    event: new ProjectCycleClosedEvent(
      'project-id',
      'owner-id',
      'cycle-id',
      ProjectCycleEndReason.COMPLETED,
      at,
    ),
    type: 'crucible.project.cycle-closed.v1',
    aggregateId: 'project-id',
    parsed: {
      projectId: 'project-id',
      ownerId: 'owner-id',
      cycleId: 'cycle-id',
      endReason: ProjectCycleEndReason.COMPLETED,
      closedAt: at,
    },
  },
  {
    name: 'HabitCreated',
    publisher: HabitOutbox,
    event: new HabitCreatedEvent(
      'habit-id',
      'owner-id',
      HabitType.BUILD,
      'Morning walk',
      HabitCalendarDate.fromPersistenceDate(
        new Date('2026-11-16T00:00:00.000Z'),
      ),
    ),
    type: 'forge.habit.created.v1',
    aggregateId: 'habit-id',
    parsed: {
      habitId: 'habit-id',
      ownerId: 'owner-id',
      habitType: 'BUILD',
      title: 'Morning walk',
      startedOn: new Date('2026-11-16T00:00:00.000Z'),
    },
  },
  {
    name: 'HabitPermanentlyDeleted',
    publisher: HabitOutbox,
    event: new HabitPermanentlyDeletedEvent('habit-id', 'owner-id'),
    type: 'forge.habit.permanently-deleted.v1',
    aggregateId: 'habit-id',
    parsed: { habitId: 'habit-id', ownerId: 'owner-id' },
  },
];

const publicationFor = (
  publisher: object,
  event: DomainEvent,
): OutboxPublication => {
  const publications = Reflect.getMetadata(
    OutboxPublisher.KEY,
    publisher,
  ) as OutboxPublication[];
  const publication = publications.find((p) => event instanceof p.event);
  if (!publication) {
    throw new Error(`No publication for ${event.constructor.name}`);
  }
  return publication;
};

describe('outbox publications', () => {
  it.each(cases)(
    '$name keeps its persisted type $type and round-trips the payload',
    ({ publisher, event, type, aggregateId, parsed }) => {
      const publication = publicationFor(publisher, event);

      expect(publication.as.type).toBe(type);
      expect(publication.aggregateId(event)).toBe(aggregateId);
      // Đi qua JSON như khi nằm trong cột jsonb.
      const stored = JSON.parse(
        JSON.stringify(publication.toPayload(event)),
      ) as Record<string, unknown>;
      expect(publication.as.parse(stored)).toEqual(parsed);
    },
  );

  it('rejects a cycle end reason the domain does not know', () => {
    const publication = publicationFor(
      ProjectOutbox,
      new ProjectCycleClosedEvent(
        'p',
        'o',
        'c',
        ProjectCycleEndReason.COMPLETED,
        at,
      ),
    );

    expect(() =>
      publication.as.parse({
        projectId: 'p',
        ownerId: 'o',
        cycleId: 'c',
        endReason: 'EXPLODED',
        closedAt: at.toISOString(),
      }),
    ).toThrow('Unknown cycle end reason "EXPLODED"');
  });

  it('rejects a habit type the domain does not know', () => {
    const publication = publicationFor(
      HabitOutbox,
      new HabitCreatedEvent(
        'h',
        'o',
        HabitType.BUILD,
        't',
        HabitCalendarDate.fromPersistenceDate(at),
      ),
    );

    expect(() =>
      publication.as.parse({
        habitId: 'h',
        ownerId: 'o',
        habitType: 'MAYBE',
        title: 't',
        startedOn: at.toISOString(),
      }),
    ).toThrow('Unknown habit type "MAYBE"');
  });

  // Contract giữ bản sao riêng của loại Habit, như lý do kết thúc chu kỳ dưới.
  it.each(Object.values(HabitType))(
    'accepts the domain habit type %s',
    (habitType) => {
      const event = new HabitCreatedEvent(
        'h',
        'o',
        habitType,
        't',
        HabitCalendarDate.fromPersistenceDate(at),
      );
      const publication = publicationFor(HabitOutbox, event);

      expect(publication.as.parse(publication.toPayload(event))).toEqual(
        expect.objectContaining({ habitType }),
      );
    },
  );

  // Contract giữ bản sao riêng của các lý do kết thúc chu kỳ. Domain thêm lý
  // do mới mà quên contract thì event đó sẽ kẹt trong outbox: chặn ở đây.
  it.each(Object.values(ProjectCycleEndReason))(
    'accepts the domain cycle end reason %s',
    (endReason) => {
      const event = new ProjectCycleClosedEvent('p', 'o', 'c', endReason, at);
      const publication = publicationFor(ProjectOutbox, event);

      expect(publication.as.parse(publication.toPayload(event))).toEqual(
        expect.objectContaining({ endReason }),
      );
    },
  );
});
