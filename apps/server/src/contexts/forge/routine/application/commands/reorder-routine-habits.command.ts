import { ICommand } from '@nestjs/cqrs';

export class ReorderRoutineHabitsCommand implements ICommand {
  public readonly routineId: string;
  public readonly ownerId: string;
  public readonly habitIds: string[];
  public readonly expectedRevision: number;

  constructor(props: {
    routineId: string;
    ownerId: string;
    habitIds: string[];
    expectedRevision: number;
  }) {
    this.routineId = props.routineId;
    this.ownerId = props.ownerId;
    this.habitIds = props.habitIds;
    this.expectedRevision = props.expectedRevision;
  }
}
