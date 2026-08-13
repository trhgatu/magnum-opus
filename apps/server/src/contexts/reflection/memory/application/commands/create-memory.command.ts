import { ICommand } from '@nestjs/cqrs';

import { MemoryDatePrecision } from '../../domain/enums';

export class CreateMemoryCommand implements ICommand {
  public readonly ownerId: string;
  public readonly sourceJournalEntryId: string | null;
  public readonly title: string;
  public readonly content: string;
  public readonly occurredOn: string | null;
  public readonly occurredOnPrecision: MemoryDatePrecision;

  constructor(props: {
    ownerId: string;
    sourceJournalEntryId?: string | null;
    title: string;
    content: string;
    occurredOn?: string | null;
    occurredOnPrecision?: MemoryDatePrecision;
  }) {
    this.ownerId = props.ownerId;
    this.sourceJournalEntryId = props.sourceJournalEntryId ?? null;
    this.title = props.title;
    this.content = props.content;
    this.occurredOn = props.occurredOn ?? null;
    this.occurredOnPrecision =
      props.occurredOnPrecision ?? MemoryDatePrecision.UNKNOWN;
  }
}
