import { randomUUID } from 'node:crypto';

import { InvalidProjectCycleIdException } from '../exceptions';

export class ProjectCycleId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidProjectCycleIdException();
    }
  }

  public static generate(): ProjectCycleId {
    return new ProjectCycleId(randomUUID());
  }

  public equals(other: ProjectCycleId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
