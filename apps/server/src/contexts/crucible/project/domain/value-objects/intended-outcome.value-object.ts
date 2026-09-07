import { InvalidIntendedOutcomeException } from '../exceptions';

export class IntendedOutcome {
  private constructor(public readonly value: string) {}

  public static create(raw: string): IntendedOutcome {
    const trimmed = raw.trim();

    if (!trimmed) {
      throw new InvalidIntendedOutcomeException();
    }

    return new IntendedOutcome(trimmed);
  }

  public equals(other: IntendedOutcome | null): boolean {
    return other !== null && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
