import { ICommand } from '@nestjs/cqrs';

import { MoodLabel } from '../../domain/enums';

export class SetMoodCommand implements ICommand {
  constructor(
    public readonly journalEntryId: string,
    public readonly ownerId: string,
    public readonly label: MoodLabel,
    public readonly intensity?: number | null,
    public readonly note?: string | null,
    public readonly expectedRevision?: number,
  ) {}
}
