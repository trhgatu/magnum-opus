import { IntendedOutcome } from './intended-outcome.value-object';

export interface IntendedOutcomeEntrySnapshot {
  sequence: number;
  outcome: string;
  setAt: Date;
}

export class IntendedOutcomeEntry {
  private constructor(
    public readonly sequence: number,
    public readonly outcome: IntendedOutcome,
    public readonly setAt: Date,
  ) {}

  public static create(
    sequence: number,
    outcome: IntendedOutcome,
    setAt: Date,
  ): IntendedOutcomeEntry {
    return new IntendedOutcomeEntry(sequence, outcome, setAt);
  }

  public toSnapshot(): IntendedOutcomeEntrySnapshot {
    return {
      sequence: this.sequence,
      outcome: this.outcome.value,
      setAt: this.setAt,
    };
  }
}
