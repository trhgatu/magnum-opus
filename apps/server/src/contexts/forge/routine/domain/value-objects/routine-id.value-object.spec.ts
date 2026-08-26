import { InvalidRoutineIdException } from '../exceptions';

import { RoutineId } from './routine-id.value-object';

describe('RoutineId', () => {
  it('creates an ID from an existing value', () => {
    const id = new RoutineId('routine-existing-id');

    expect(id.value).toBe('routine-existing-id');
    expect(id.toString()).toBe('routine-existing-id');
  });

  it('generates a new UUID', () => {
    const id = RoutineId.generate();

    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it.each(['', '   '])('rejects an empty ID: %p', (value) => {
    expect(() => new RoutineId(value)).toThrow(InvalidRoutineIdException);
  });

  it('compares IDs by value', () => {
    const first = new RoutineId('same-routine');
    const second = new RoutineId('same-routine');
    const third = new RoutineId('another-routine');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(third)).toBe(false);
  });
});
