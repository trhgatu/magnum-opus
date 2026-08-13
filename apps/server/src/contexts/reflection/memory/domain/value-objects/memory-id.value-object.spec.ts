import { InvalidMemoryIdException } from '../exceptions';

import { MemoryId } from './memory-id.value-object';

describe('MemoryId', () => {
  it('creates an ID from an existing value', () => {
    const id = new MemoryId('memory-id');

    expect(id.value).toBe('memory-id');
    expect(id.toString()).toBe('memory-id');
  });

  it('generates a new UUID', () => {
    const id = MemoryId.generate();

    expect(id.value).toBeTruthy();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('rejects an empty ID', () => {
    expect(() => new MemoryId('')).toThrow(InvalidMemoryIdException);
    expect(() => new MemoryId('   ')).toThrow(InvalidMemoryIdException);
  });

  it('compares IDs by value', () => {
    const first = new MemoryId('same-id');
    const second = new MemoryId('same-id');
    const different = new MemoryId('different-id');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });
});
