import { ICommand } from '@nestjs/cqrs';

export class CreateRoutineCommand implements ICommand {
  public readonly ownerId: string;
  public readonly title: string;

  constructor(props: { ownerId: string; title: string }) {
    this.ownerId = props.ownerId;
    this.title = props.title;
  }
}
