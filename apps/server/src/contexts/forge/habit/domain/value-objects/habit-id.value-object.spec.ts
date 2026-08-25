import { InvalidHabitIdException } from '../exceptions';

import { HabitId } from './habit-id.value-object';

describe('HabitId', () => {
  it('creates an ID from an existing value', () => {
    const id = new HabitId('habit-id');

    expect(id.value).toBe('habit-id');
    expect(id.toString()).toBe('habit-id');
  });

  it('generates a new UUID', () => {
    const id = HabitId.generate();

    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('rejects an empty ID', () => {
    expect(() => new HabitId('')).toThrow(InvalidHabitIdException);
    expect(() => new HabitId('   ')).toThrow(InvalidHabitIdException);
  });

  it('compares IDs by value', () => {
    expect(new HabitId('same-id').equals(new HabitId('same-id'))).toBe(true);
    expect(new HabitId('first-id').equals(new HabitId('second-id'))).toBe(
      false,
    );
  });
});
