import { ProjectCycleEndReason } from './enums';
import {
  ProjectCycleId,
  ClosingNote,
  IntendedOutcome,
  IntendedOutcomeEntry,
  type IntendedOutcomeEntrySnapshot,
} from './value-objects';

export interface ProjectCycleProps {
  id: ProjectCycleId;
  cycleNumber: number;
  outcomeHistory: IntendedOutcomeEntry[];
  startedAt: Date;
  endedAt: Date | null;
  endReason: ProjectCycleEndReason | null;
  closingNote: ClosingNote | null;
  targetEndAt: string | null;
}

export interface ProjectCyclePrimitives {
  id: string;
  cycleNumber: number;
  intendedOutcome: string | null;
  outcomeHistory: IntendedOutcomeEntrySnapshot[];
  startedAt: Date;
  endedAt: Date | null;
  endReason: ProjectCycleEndReason | null;
  closingNote: string | null;
  targetEndAt: string | null;
}

export class ProjectCycle {
  private constructor(private readonly props: ProjectCycleProps) {}

  public static create(input: {
    cycleNumber: number;
    startedAt: Date;
  }): ProjectCycle {
    return new ProjectCycle({
      id: ProjectCycleId.generate(),
      cycleNumber: input.cycleNumber,
      outcomeHistory: [],
      startedAt: input.startedAt,
      endedAt: null,
      endReason: null,
      closingNote: null,
      targetEndAt: null,
    });
  }

  public static rehydrate(props: ProjectCycleProps): ProjectCycle {
    return new ProjectCycle({
      ...props,
      outcomeHistory: [...props.outcomeHistory].sort(
        (left, right) => left.sequence - right.sequence,
      ),
    });
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get cycleNumber(): number {
    return this.props.cycleNumber;
  }

  public get intendedOutcome(): string | null {
    return this.latestEntry()?.outcome.value ?? null;
  }

  public get outcomeHistory(): readonly IntendedOutcomeEntrySnapshot[] {
    return this.props.outcomeHistory.map((entry) => entry.toSnapshot());
  }

  public get startedAt(): Date {
    return this.props.startedAt;
  }

  public get endedAt(): Date | null {
    return this.props.endedAt;
  }

  public get endReason(): ProjectCycleEndReason | null {
    return this.props.endReason;
  }
  public get closingNote(): string | null {
    return this.props.closingNote?.value ?? null;
  }

  public get targetEndAt(): string | null {
    return this.props.targetEndAt;
  }

  public get isOpen(): boolean {
    return this.props.endedAt === null;
  }

  public recordIntendedOutcome(outcome: IntendedOutcome, setAt: Date): boolean {
    const latest = this.latestEntry();
    if (latest && outcome.equals(latest.outcome)) return false;

    this.props.outcomeHistory.push(
      IntendedOutcomeEntry.create((latest?.sequence ?? 0) + 1, outcome, setAt),
    );
    return true;
  }

  public setTargetEndAt(date: string | null): boolean {
    if (this.props.targetEndAt === date) return false;

    this.props.targetEndAt = date;
    return true;
  }

  public close(
    reason: ProjectCycleEndReason,
    closingNote: ClosingNote | null,
  ): void {
    this.props.endedAt = new Date();
    this.props.endReason = reason;
    this.props.closingNote = closingNote;
  }

  public toPrimitives(): ProjectCyclePrimitives {
    return {
      id: this.props.id.value,
      cycleNumber: this.props.cycleNumber,
      intendedOutcome: this.intendedOutcome,
      outcomeHistory: this.outcomeHistory.slice(),
      startedAt: this.props.startedAt,
      endedAt: this.props.endedAt,
      endReason: this.props.endReason,
      closingNote: this.closingNote,
      targetEndAt: this.props.targetEndAt,
    };
  }

  private latestEntry(): IntendedOutcomeEntry | undefined {
    return this.props.outcomeHistory.at(-1);
  }
}
