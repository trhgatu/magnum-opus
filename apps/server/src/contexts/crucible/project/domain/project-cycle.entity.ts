import { ProjectCycleEndReason } from './enums';
import { ProjectCycleId } from './value-objects';
import { IntendedOutcome } from './value-objects';

export interface ProjectCycleProps {
  id: ProjectCycleId;
  cycleNumber: number;
  intendedOutcome: IntendedOutcome | null;
  startedAt: Date;
  endedAt: Date | null;
  endReason: ProjectCycleEndReason | null;
}

export interface ProjectCyclePrimitives {
  id: string;
  cycleNumber: number;
  intendedOutcome: string | null;
  startedAt: Date;
  endedAt: Date | null;
  endReason: ProjectCycleEndReason | null;
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
      intendedOutcome: null,
      startedAt: input.startedAt,
      endedAt: null,
      endReason: null,
    });
  }

  public static rehydrate(props: ProjectCycleProps): ProjectCycle {
    return new ProjectCycle(props);
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get cycleNumber(): number {
    return this.props.cycleNumber;
  }

  public get intendedOutcome(): string | null {
    return this.props.intendedOutcome?.value ?? null;
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

  public get isOpen(): boolean {
    return this.props.endedAt === null;
  }

  public setIntendedOutcome(outcome: IntendedOutcome): void {
    this.props.intendedOutcome = outcome;
  }

  public close(reason: ProjectCycleEndReason): void {
    this.props.endedAt = new Date();
    this.props.endReason = reason;
  }

  public toPrimitives(): ProjectCyclePrimitives {
    return {
      id: this.props.id.value,
      cycleNumber: this.props.cycleNumber,
      intendedOutcome: this.props.intendedOutcome?.value ?? null,
      startedAt: this.props.startedAt,
      endedAt: this.props.endedAt,
      endReason: this.props.endReason,
    };
  }
}
