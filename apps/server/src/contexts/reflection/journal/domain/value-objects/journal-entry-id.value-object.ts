import { randomUUID } from 'node:crypto';

import { InvalidJournalEntryIdException } from '../exceptions';

export class JournalEntryId {
  constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidJournalEntryIdException();
    }
  }

  public static generate(): JournalEntryId {
    return new JournalEntryId(randomUUID());
  }

  public equals(other: JournalEntryId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
