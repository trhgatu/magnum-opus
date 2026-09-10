import { InvalidHabitRelapseIdException } from '../exceptions';
import { HabitRelapseId } from './habit-relapse-id.value-object';

describe('HabitRelapseId', () => {
  it('generates a valid UUID', () => {
    expect(() =>
      HabitRelapseId.create(HabitRelapseId.generate().value),
    ).not.toThrow();
  });

  it('accepts a well-formed UUID', () => {
    const id = HabitRelapseId.create('550e8400-e29b-41d4-a716-446655440000');

    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects a malformed value', () => {
    expect(() => HabitRelapseId.create('not-a-uuid')).toThrow(
      InvalidHabitRelapseIdException,
    );
  });
});
