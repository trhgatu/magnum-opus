import { ICommand } from '@nestjs/cqrs';

export class RemoveRoutineHabitCommand implements ICommand {
  public readonly routineId: string;
  public readonly ownerId: string;
  public readonly habitId: string;
  public readonly expectedRevision: number;

  constructor(props: {
    routineId: string;
    ownerId: string;
    habitId: string;
    expectedRevision: number;
  }) {
    this.routineId = props.routineId;
    this.ownerId = props.ownerId;
    this.habitId = props.habitId;
    this.expectedRevision = props.expectedRevision;
  }
}
