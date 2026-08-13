import { IQuery } from '@nestjs/cqrs';

import { MemoryState } from '../../domain/enums';
import type {
  MemorySortField,
  SortOrder,
} from '../../domain/ports/memory.repository';

export class GetMemoriesQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page = 1,
    public readonly limit = 10,
    public readonly state?: MemoryState,
    public readonly search?: string,
    public readonly sortBy?: MemorySortField,
    public readonly sortOrder: SortOrder = 'desc',
  ) {}
}
