import { InvalidMoodIdException } from '../exceptions';

import { MoodId } from './mood-id.value-object';

describe('MoodId', () => {
  it('creates an ID from an existing value', () => {
    const id = new MoodId('mood-id');

    expect(id.value).toBe('mood-id');
    expect(id.toString()).toBe('mood-id');
  });

  it('generates a new UUID', () => {
    const id = MoodId.generate();

    expect(id.value).toBeTruthy();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('rejects an empty ID', () => {
    expect(() => new MoodId('')).toThrow(InvalidMoodIdException);
    expect(() => new MoodId('   ')).toThrow(InvalidMoodIdException);
  });

  it('compares IDs by value', () => {
    const first = new MoodId('same-id');
    const second = new MoodId('same-id');
    const different = new MoodId('different-id');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});
