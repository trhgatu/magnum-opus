import { MemoryState } from './enums';
import { MemoryCreatedEvent } from './events/memory-created.event';
import {
  InvalidMemoryContentException,
  InvalidMemoryTitleException,
  InvalidMemoryTransitionException,
} from './exceptions';
import { Memory, type MemoryProps } from './memory.aggregate';
import { MemoryId, MemoryOccurredOn } from './value-objects';

describe('Memory', () => {
  describe('create', () => {
    it('creates an active Memory at revision 1', () => {
      const memory = Memory.create({
        ownerId: 'owner-id',
        title: '  The rainy construction site  ',
        content: '  I felt completely still.  ',
        occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
      });

      expect(memory.id).toBeTruthy();
      expect(memory.ownerId).toBe('owner-id');
      expect(memory.sourceJournalEntryId).toBeNull();
      expect(memory.title).toBe('The rainy construction site');
      expect(memory.content).toBe('I felt completely still.');
      expect(memory.occurredOn.value).toBe('2024-08-01');
      expect(memory.state).toBe(MemoryState.ACTIVE);
      expect(memory.revision).toBe(1);
      expect(memory.trashedAt).toBeNull();
      expect(memory.createdAt).toEqual(memory.updatedAt);
    });

    it('creates an unknown occurrence date by default', () => {
      const memory = createMemory();

      expect(memory.occurredOn.value).toBeNull();
      expect(memory.occurredOn.precision).toBe('UNKNOWN');
    });

    it('emits a MemoryCreatedEvent carrying the memory, owner and occurrence date', () => {
      const memory = Memory.create({
        ownerId: 'owner-id',
        title: 'The rainy construction site',
        content: 'I felt completely still.',
        occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
      });

      const events = memory.getDomainEvents();
      expect(events).toHaveLength(1);
      const [event] = events;
      expect(event).toBeInstanceOf(MemoryCreatedEvent);
      expect((event as MemoryCreatedEvent).memoryId).toBe(memory.id);
      expect((event as MemoryCreatedEvent).ownerId).toBe(memory.ownerId);
      expect((event as MemoryCreatedEvent).memoryOccurredOn).toEqual(
        new Date('2024-08-01T00:00:00.000Z'),
      );
    });

    it('emits a null occurrence date on the event when the date is unknown', () => {
      const memory = createMemory();

      const [event] = memory.getDomainEvents();

      expect((event as MemoryCreatedEvent).memoryOccurredOn).toBeNull();
    });

    it('preserves an optional Journal source', () => {
      const memory = Memory.create({
        ownerId: 'owner-id',
        sourceJournalEntryId: 'journal-id',
        title: 'A remembered afternoon',
        content: 'The original experience.',
      });

      expect(memory.sourceJournalEntryId).toBe('journal-id');
    });

    it('rejects a blank title', () => {
      expect(() =>
        Memory.create({
          ownerId: 'owner-id',
          title: '   ',
          content: 'Meaningful content',
        }),
      ).toThrow(InvalidMemoryTitleException);
    });

    it('rejects a title longer than 200 characters', () => {
      expect(() =>
        Memory.create({
          ownerId: 'owner-id',
          title: 'a'.repeat(201),
          content: 'Meaningful content',
        }),
      ).toThrow(InvalidMemoryTitleException);
    });

    it('rejects blank content', () => {
      expect(() =>
        Memory.create({
          ownerId: 'owner-id',
          title: 'A title',
          content: '   ',
        }),
      ).toThrow(InvalidMemoryContentException);
    });
  });

  describe('update', () => {
    it('updates editable fields and increments revision', () => {
      const memory = createMemory();

      memory.update({
        title: '  A clearer title  ',
        content: '  A clearer memory  ',
        occurredOn: MemoryOccurredOn.fromYear(2018),
      });

      expect(memory.title).toBe('A clearer title');
      expect(memory.content).toBe('A clearer memory');
      expect(memory.occurredOn.value).toBe('2018-01-01');
      expect(memory.revision).toBe(2);
    });

    it('does not increment revision for normalized equal values', () => {
      const memory = createMemory({
        occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
      });

      memory.update({
        title: '  Original title  ',
        content: '  Original content  ',
        occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
      });

      expect(memory.revision).toBe(1);
    });

    it('does not allow editing a trashed Memory', () => {
      const memory = createMemory();

      memory.moveToTrash();

      expect(() =>
        memory.update({
          title: 'Changed title',
          content: 'Changed content',
          occurredOn: MemoryOccurredOn.unknown(),
        }),
      ).toThrow(InvalidMemoryTransitionException);
    });

    it('does not change its Journal source', () => {
      const memory = createMemory({
        sourceJournalEntryId: 'journal-id',
      });

      memory.update({
        title: 'Updated title',
        content: 'Updated content',
        occurredOn: MemoryOccurredOn.unknown(),
      });

      expect(memory.sourceJournalEntryId).toBe('journal-id');
    });
  });

  describe('trash and restore', () => {
    it('moves an active Memory to Trash', () => {
      const memory = createMemory();

      memory.moveToTrash();

      expect(memory.state).toBe(MemoryState.TRASHED);
      expect(memory.trashedAt).toBeInstanceOf(Date);
      expect(memory.revision).toBe(2);
    });

    it('restores a trashed Memory', () => {
      const memory = createMemory();

      memory.moveToTrash();
      memory.restore();

      expect(memory.state).toBe(MemoryState.ACTIVE);
      expect(memory.trashedAt).toBeNull();
      expect(memory.revision).toBe(3);
    });

    it('does not trash an already trashed Memory', () => {
      const memory = createMemory();

      memory.moveToTrash();

      expect(() => memory.moveToTrash()).toThrow(
        InvalidMemoryTransitionException,
      );
    });

    it('does not restore an active Memory', () => {
      const memory = createMemory();

      expect(() => memory.restore()).toThrow(InvalidMemoryTransitionException);
    });
  });

  describe('rehydrate and primitives', () => {
    it('rehydrates without changing persisted state', () => {
      const props = createProps({
        state: MemoryState.TRASHED,
        revision: 7,
        trashedAt: new Date('2026-08-10T10:00:00Z'),
      });

      const memory = Memory.rehydrate(props);

      expect(memory.id).toBe('memory-id');
      expect(memory.state).toBe(MemoryState.TRASHED);
      expect(memory.revision).toBe(7);
      expect(memory.trashedAt).toEqual(props.trashedAt);
      // rehydrate() dựng lại state đã có sẵn từ DB — không phải hành động
      // nghiệp vụ mới nên không được phát lại MemoryCreatedEvent.
      expect(memory.getDomainEvents()).toEqual([]);
    });

    it('converts the aggregate into persistence primitives', () => {
      const memory = Memory.rehydrate(createProps());

      expect(memory.toPrimitives()).toEqual({
        id: 'memory-id',
        ownerId: 'owner-id',
        sourceJournalEntryId: 'journal-id',
        title: 'Original title',
        content: 'Original content',
        occurredOn: '2024-08-01',
        occurredOnPrecision: 'MONTH',
        state: MemoryState.ACTIVE,
        revision: 1,
        trashedAt: null,
        createdAt: new Date('2026-08-01T10:00:00Z'),
        updatedAt: new Date('2026-08-01T10:00:00Z'),
      });
    });
  });
});

function createMemory(
  overrides: Partial<{
    sourceJournalEntryId: string | null;
    occurredOn: MemoryOccurredOn;
  }> = {},
): Memory {
  return Memory.create({
    ownerId: 'owner-id',
    sourceJournalEntryId: overrides.sourceJournalEntryId,
    title: 'Original title',
    content: 'Original content',
    occurredOn: overrides.occurredOn,
  });
}

function createProps(overrides: Partial<MemoryProps> = {}): MemoryProps {
  const timestamp = new Date('2026-08-01T10:00:00Z');

  return {
    id: new MemoryId('memory-id'),
    ownerId: 'owner-id',
    sourceJournalEntryId: 'journal-id',
    title: 'Original title',
    content: 'Original content',
    occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
    state: MemoryState.ACTIVE,
    revision: 1,
    trashedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}
