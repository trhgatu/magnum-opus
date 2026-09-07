import { randomUUID } from 'node:crypto';

import { InvalidProjectIdException } from '../exceptions';

export class ProjectId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidProjectIdException();
    }
  }

  public static generate(): ProjectId {
    return new ProjectId(randomUUID());
  }

  public equals(other: ProjectId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
