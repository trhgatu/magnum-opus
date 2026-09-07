import { ICommand } from '@nestjs/cqrs';

export class CreateProjectCommand implements ICommand {
  public readonly ownerId: string;
  public readonly title: string;
  public readonly description: string | null;

  constructor(props: {
    ownerId: string;
    title: string;
    description?: string | null;
  }) {
    this.ownerId = props.ownerId;
    this.title = props.title;
    this.description = props.description ?? null;
  }
}
