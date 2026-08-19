import { JournalEntryState } from './enums';
import { JournalEntrySealedEvent } from './events/journal-entry-sealed.event';
import {
  InvalidJournalEntryTitleException,
  InvalidJournalEntryTransitionException,
} from './exceptions';
import { JournalEntry } from './journal-entry.aggregate';
import { JournalEntryId } from './value-objects';

describe('JournalEntry', () => {
  describe('createDraft', () => {
    it('creates a new draft at revision 1', () => {
      const entry = JournalEntry.createDraft({
        ownerId: 'owner-1',
        title: '  My first entry  ',
        content: 'Hello',
      });

      expect(entry.id).toBeTruthy();
      expect(entry.ownerId).toBe('owner-1');
      expect(entry.title).toBe('My first entry');
      expect(entry.content).toBe('Hello');
      expect(entry.state).toBe(JournalEntryState.DRAFT);
      expect(entry.stateBeforeTrash).toBeNull();
      expect(entry.trashedAt).toBeNull();
      expect(entry.revision).toBe(1);
    });

    it('normalizes a blank title to null', () => {
      const entry = JournalEntry.createDraft({
        ownerId: 'owner-1',
        title: '   ',
      });

      expect(entry.title).toBeNull();
      expect(entry.content).toBe('');
    });

    it('rejects a title longer than 200 characters', () => {
      expect(() =>
        JournalEntry.createDraft({
          ownerId: 'owner-1',
          title: 'a'.repeat(201),
        }),
      ).toThrow(InvalidJournalEntryTitleException);
    });
  });

  describe('content editing', () => {
    it('updates a draft and increments its revision', () => {
      const entry = createEntry();

      entry.updateContent({
        title: 'Changed title',
        content: 'Changed content',
      });

      expect(entry.title).toBe('Changed title');
      expect(entry.content).toBe('Changed content');
      expect(entry.revision).toBe(2);
    });

    it('does not increment revision when nothing changed', () => {
      const entry = createEntry();

      entry.updateContent({
        title: entry.title,
        content: entry.content,
      });

      expect(entry.revision).toBe(1);
    });

    it('validates a new title before changing the entry', () => {
      const entry = createEntry();

      expect(() =>
        entry.updateContent({
          title: 'a'.repeat(201),
          content: 'Changed content',
        }),
      ).toThrow(InvalidJournalEntryTitleException);

      expect(entry.title).toBe('Original title');
      expect(entry.content).toBe('Original content');
      expect(entry.revision).toBe(1);
    });

    it('does not allow editing a sealed entry', () => {
      const entry = createEntry();

      entry.seal();

      expect(() =>
        entry.updateContent({
          title: 'Forbidden change',
          content: 'Forbidden change',
        }),
      ).toThrow(InvalidJournalEntryTransitionException);

      expect(entry.revision).toBe(2);
    });

    it('does not allow editing a trashed entry', () => {
      const entry = createEntry();

      entry.moveToTrash();

      expect(() =>
        entry.updateContent({
          title: 'Forbidden change',
          content: 'Forbidden change',
        }),
      ).toThrow(InvalidJournalEntryTransitionException);

      expect(entry.revision).toBe(2);
    });
  });

  describe('seal and reopen', () => {
    it('seals a draft', () => {
      const entry = createEntry();

      entry.seal();

      expect(entry.state).toBe(JournalEntryState.SEALED);
      expect(entry.revision).toBe(2);
    });

    it('emits a JournalEntrySealedEvent carrying the entry, owner and seal time', () => {
      const entry = createEntry();

      entry.seal();

      const events = entry.getDomainEvents();
      expect(events).toHaveLength(1);
      const [event] = events;
      expect(event).toBeInstanceOf(JournalEntrySealedEvent);
      expect((event as JournalEntrySealedEvent).journalEntryId).toBe(entry.id);
      expect((event as JournalEntrySealedEvent).ownerId).toBe(entry.ownerId);
      expect((event as JournalEntrySealedEvent).sealedAt).toEqual(
        entry.updatedAt,
      );
    });

    it('does not emit any event while only editing content', () => {
      const entry = createEntry();

      entry.updateContent({
        title: 'Changed title',
        content: 'Changed content',
      });

      expect(entry.getDomainEvents()).toEqual([]);
    });

    it('reopens a sealed entry', () => {
      const entry = createEntry();

      entry.seal();
      entry.reopen();

      expect(entry.state).toBe(JournalEntryState.DRAFT);
      expect(entry.revision).toBe(3);
    });

    it('does not seal an already sealed entry', () => {
      const entry = createEntry();

      entry.seal();

      expect(() => entry.seal()).toThrow(
        InvalidJournalEntryTransitionException,
      );
    });

    it('does not reopen a draft', () => {
      const entry = createEntry();

      expect(() => entry.reopen()).toThrow(
        InvalidJournalEntryTransitionException,
      );
    });
  });

  describe('trash and restore', () => {
    it('restores a draft back to draft', () => {
      const entry = createEntry();

      entry.moveToTrash();

      expect(entry.state).toBe(JournalEntryState.TRASHED);
      expect(entry.stateBeforeTrash).toBe(JournalEntryState.DRAFT);
      expect(entry.trashedAt).toBeInstanceOf(Date);
      expect(entry.revision).toBe(2);

      entry.restore();

      expect(entry.state).toBe(JournalEntryState.DRAFT);
      expect(entry.stateBeforeTrash).toBeNull();
      expect(entry.trashedAt).toBeNull();
      expect(entry.revision).toBe(3);
    });

    it('restores a sealed entry back to sealed', () => {
      const entry = createEntry();

      entry.seal();
      entry.moveToTrash();
      entry.restore();

      expect(entry.state).toBe(JournalEntryState.SEALED);
      expect(entry.stateBeforeTrash).toBeNull();
      expect(entry.trashedAt).toBeNull();
      expect(entry.revision).toBe(4);
    });

    it('does not move an already trashed entry to trash again', () => {
      const entry = createEntry();

      entry.moveToTrash();

      expect(() => entry.moveToTrash()).toThrow(
        InvalidJournalEntryTransitionException,
      );
    });

    it('does not restore an entry outside trash', () => {
      const entry = createEntry();

      expect(() => entry.restore()).toThrow(
        InvalidJournalEntryTransitionException,
      );
    });
  });

  describe('rehydrate', () => {
    it('restores an existing entry without changing its revision', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const updatedAt = new Date('2026-08-02T00:00:00.000Z');

      const entry = JournalEntry.rehydrate({
        id: new JournalEntryId('entry-1'),
        ownerId: 'owner-1',
        title: 'Existing entry',
        content: 'Existing content',
        state: JournalEntryState.SEALED,
        stateBeforeTrash: null,
        revision: 7,
        trashedAt: null,
        createdAt,
        updatedAt,
      });

      expect(entry.toPrimitives()).toEqual({
        id: 'entry-1',
        ownerId: 'owner-1',
        title: 'Existing entry',
        content: 'Existing content',
        state: JournalEntryState.SEALED,
        stateBeforeTrash: null,
        revision: 7,
        trashedAt: null,
        createdAt,
        updatedAt,
      });

      expect(entry.getDomainEvents()).toEqual([]);
    });
  });
});

function createEntry(): JournalEntry {
  return JournalEntry.createDraft({
    ownerId: 'owner-1',
    title: 'Original title',
    content: 'Original content',
  });
}
