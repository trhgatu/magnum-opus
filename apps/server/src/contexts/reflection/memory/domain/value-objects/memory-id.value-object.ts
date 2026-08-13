import { randomUUID } from 'node:crypto';

import { InvalidMemoryIdException } from '../exceptions';

export class MemoryId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidMemoryIdException();
    }
  }

  public static generate(): MemoryId {
    return new MemoryId(randomUUID());
  }

  public equals(other: MemoryId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
