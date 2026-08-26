import { ICommand } from '@nestjs/cqrs';

export class UpdateRoutineTitleCommand implements ICommand {
  public readonly routineId: string;
  public readonly ownerId: string;
  public readonly expectedRevision: number;
  public readonly title: string;

  constructor(props: {
    routineId: string;
    ownerId: string;
    expectedRevision: number;
    title: string;
  }) {
    this.routineId = props.routineId;
    this.ownerId = props.ownerId;
    this.expectedRevision = props.expectedRevision;
    this.title = props.title;
  }
}
