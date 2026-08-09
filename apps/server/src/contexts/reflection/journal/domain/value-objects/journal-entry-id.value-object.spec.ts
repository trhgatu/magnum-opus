import { InvalidJournalEntryIdException } from '../exceptions';

import { JournalEntryId } from './journal-entry-id.value-object';

describe('JournalEntryId', () => {
  it('creates an ID from an existing value', () => {
    const id = new JournalEntryId('journal-entry-id');

    expect(id.value).toBe('journal-entry-id');
    expect(id.toString()).toBe('journal-entry-id');
  });

  it('generates a new ID', () => {
    const id = JournalEntryId.generate();

    expect(id.value).toBeTruthy();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('rejects an empty ID', () => {
    expect(() => new JournalEntryId('')).toThrow(
      InvalidJournalEntryIdException,
    );

    expect(() => new JournalEntryId('   ')).toThrow(
      InvalidJournalEntryIdException,
    );
  });

  it('compares IDs by value', () => {
    const first = new JournalEntryId('same-id');
    const second = new JournalEntryId('same-id');
    const different = new JournalEntryId('different-id');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});
