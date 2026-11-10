import type { OnThisDayRecord } from '../ports/on-this-day-reader.port';
import { onThisDayMonthDays, toOnThisDayItems } from './on-this-day';

const record = (
  id: string,
  day: string,
  overrides: Partial<OnThisDayRecord> = {},
): OnThisDayRecord => ({
  id,
  title: id,
  day,
  excerpt: null,
  sourceJournalEntryId: null,
  ...overrides,
});

describe('onThisDayMonthDays', () => {
  it('looks for the same month and day', () => {
    expect(onThisDayMonthDays('2026-11-10')).toEqual(['11-10']);
  });

  it('brings 29 February to 28 February in a common year', () => {
    expect(onThisDayMonthDays('2027-02-28')).toEqual(['02-28', '02-29']);
  });

  it('keeps 28 February alone in a leap year, when 29 February comes', () => {
    expect(onThisDayMonthDays('2028-02-28')).toEqual(['02-28']);
    expect(onThisDayMonthDays('2028-02-29')).toEqual(['02-29']);
  });

  it('follows the century rule for leap years', () => {
    // 2100 không nhuận, 2000 nhuận.
    expect(onThisDayMonthDays('2100-02-28')).toEqual(['02-28', '02-29']);
    expect(onThisDayMonthDays('2000-02-28')).toEqual(['02-28']);
  });
});

describe('toOnThisDayItems', () => {
  it('counts the years and puts the nearest first, memories before pages', () => {
    const items = toOnThisDayItems(
      '2026-11-10',
      [record('trip', '2023-11-10'), record('run', '2025-11-10')],
      [record('page', '2025-11-10'), record('old-page', '2024-11-10')],
    );

    expect(
      items.map(({ kind, id, yearsAgo }) => ({ kind, id, yearsAgo })),
    ).toEqual([
      { kind: 'MEMORY', id: 'run', yearsAgo: 1 },
      { kind: 'JOURNAL', id: 'page', yearsAgo: 1 },
      { kind: 'JOURNAL', id: 'old-page', yearsAgo: 2 },
      { kind: 'MEMORY', id: 'trip', yearsAgo: 3 },
    ]);
  });

  it('counts a 29 February memory shown on 28 February', () => {
    const [item] = toOnThisDayItems(
      '2027-02-28',
      [record('leap', '2024-02-29')],
      [],
    );

    expect(item).toMatchObject({ id: 'leap', day: '2024-02-29', yearsAgo: 3 });
  });

  it('drops a page that a memory of the list was distilled from', () => {
    const items = toOnThisDayItems(
      '2026-11-10',
      [record('memory', '2025-11-10', { sourceJournalEntryId: 'source' })],
      [record('source', '2025-11-10'), record('other', '2025-11-10')],
    );

    expect(items.map(({ id }) => id)).toEqual(['memory', 'other']);
  });

  it('returns nothing without anything from past years', () => {
    expect(toOnThisDayItems('2026-11-10', [], [])).toEqual([]);
  });
});
