import { IQuery } from '@nestjs/cqrs';

import { JournalEntryState } from '../../domain/enums';
import type { JournalEntrySortField } from '../../domain/ports/journal-entry.repository';

export class GetJournalEntriesQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly state?: JournalEntryState,
    public readonly search?: string,
    public readonly sortBy?: JournalEntrySortField,
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
  ) {}
}
