import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Memory } from '../../../domain/memory.aggregate';
import {
  MEMORY_REPOSITORY,
  type MemoryRepository,
} from '../../../domain/ports/memory.repository';
import { GetMemoriesQuery } from '../get-memories.query';

export interface GetMemoriesResult {
  memories: Memory[];
  total: number;
}

@QueryHandler(GetMemoriesQuery)
export class GetMemoriesHandler implements IQueryHandler<
  GetMemoriesQuery,
  Result<GetMemoriesResult, DomainException>
> {
  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: MemoryRepository,
  ) {}

  public async execute(
    query: GetMemoriesQuery,
  ): Promise<Result<GetMemoriesResult, DomainException>> {
    const result = await this.memoryRepository.findAllForOwner(query.ownerId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      state: query.state,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      sourceJournalEntryId: query.sourceJournalEntryId,
    });

    return Result.ok(result);
  }
}
