import { lanternPlacedOn, lanternPrecision } from './garden-lantern';

describe('lanternPrecision', () => {
  const day = new Date('2018-08-01T00:00:00.000Z');

  it('keeps a known precision of a dated memory', () => {
    expect(lanternPrecision('MONTH', day)).toBe('MONTH');
    expect(lanternPrecision('YEAR', day)).toBe('YEAR');
  });

  it('is UNKNOWN whenever the memory has no date', () => {
    expect(lanternPrecision('DAY', null)).toBe('UNKNOWN');
    expect(lanternPrecision(null, null)).toBe('UNKNOWN');
  });

  it('reads an older event without a precision as a full day', () => {
    expect(lanternPrecision(null, day)).toBe('DAY');
    expect(lanternPrecision('SOMETIME', day)).toBe('DAY');
  });
});

describe('lanternPlacedOn (BR-GDN-LN-003)', () => {
  it('places a dated memory on its own day', () => {
    expect(lanternPlacedOn('2018-08-11', 'DAY')).toBe('2018-08-11');
  });

  it('places a month or a year in the middle of it', () => {
    expect(lanternPlacedOn('2018-08-01', 'MONTH')).toBe('2018-08-15');
    expect(lanternPlacedOn('2018-01-01', 'YEAR')).toBe('2018-07-01');
  });

  it('leaves an undated memory for the cluster at the start of the path', () => {
    expect(lanternPlacedOn(null, 'UNKNOWN')).toBeNull();
  });
});
