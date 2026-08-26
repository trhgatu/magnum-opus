import { randomUUID } from 'node:crypto';

import { InvalidRoutineIdException } from '../exceptions';

export class RoutineId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidRoutineIdException();
    }
  }

  public static generate(): RoutineId {
    return new RoutineId(randomUUID());
  }

  public equals(other: RoutineId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
