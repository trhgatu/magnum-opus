import { randomUUID } from 'node:crypto';

import { InvalidHabitCheckInIdException } from '../exceptions';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class HabitCheckInId {
  private constructor(public readonly value: string) {}

  public static create(value: string): HabitCheckInId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidHabitCheckInIdException();
    }

    return new HabitCheckInId(value);
  }

  public static generate(): HabitCheckInId {
    return new HabitCheckInId(randomUUID());
  }
}
