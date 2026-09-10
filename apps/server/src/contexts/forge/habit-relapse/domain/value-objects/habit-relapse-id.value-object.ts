import { randomUUID } from 'node:crypto';

import { InvalidHabitRelapseIdException } from '../exceptions';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HabitRelapseId {
  private constructor(public readonly value: string) {}

  public static create(value: string): HabitRelapseId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidHabitRelapseIdException();
    }

    return new HabitRelapseId(value);
  }

  public static generate(): HabitRelapseId {
    return new HabitRelapseId(randomUUID());
  }
}
