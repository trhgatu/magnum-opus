import { JournalEntryState } from '../../domain/enums';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../domain/value-objects';
import { JournalEntryPresenter } from './journal-entry.presenter';

describe('JournalEntryPresenter', () => {
  it('returns the public API shape without owner internals', () => {
    const entry = JournalEntry.rehydrate({
      id: new JournalEntryId('entry-1'),
      ownerId: 'owner-1',
      title: 'Entry',
      content: 'Content',
      state: JournalEntryState.DRAFT,
      stateBeforeTrash: null,
      revision: 2,
      trashedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    });

    expect(JournalEntryPresenter.toResponse(entry)).toEqual({
      id: 'entry-1',
      title: 'Entry',
      content: 'Content',
      state: 'DRAFT',
      stateBeforeTrash: null,
      revision: 2,
      trashedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
  });
});
