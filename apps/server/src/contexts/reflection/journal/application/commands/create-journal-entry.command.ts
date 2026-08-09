import { ICommand } from '@nestjs/cqrs';

export class CreateJournalEntryCommand implements ICommand {
  public readonly ownerId: string;
  public readonly title?: string | null;
  public readonly content?: string;

  constructor(props: {
    ownerId: string;
    title?: string | null;
    content?: string;
  }) {
    this.ownerId = props.ownerId;
    this.title = props.title;
    this.content = props.content;
  }
}
