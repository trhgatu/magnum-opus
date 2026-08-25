import { randomUUID } from 'node:crypto';

import { InvalidHabitIdException } from '../exceptions';

export class HabitId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidHabitIdException();
    }
  }

  public static generate(): HabitId {
    return new HabitId(randomUUID());
  }

  public equals(other: HabitId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
