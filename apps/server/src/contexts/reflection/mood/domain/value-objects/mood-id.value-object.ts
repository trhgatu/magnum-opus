import { randomUUID } from 'node:crypto';

import { InvalidMoodIdException } from '../exceptions';

export class MoodId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidMoodIdException();
    }
  }

  public static generate(): MoodId {
    return new MoodId(randomUUID());
  }

  public equals(other: MoodId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
