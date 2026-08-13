import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { MemoryNotFoundException } from '../../../domain/exceptions';
import { Memory } from '../../../domain/memory.aggregate';
import {
  MEMORY_REPOSITORY,
  type MemoryRepository,
} from '../../../domain/ports/memory.repository';
import { GetMemoryQuery } from '../get-memory.query';

@QueryHandler(GetMemoryQuery)
export class GetMemoryHandler implements IQueryHandler<
  GetMemoryQuery,
  Result<Memory, DomainException>
> {
  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: MemoryRepository,
  ) {}

  public async execute(
    query: GetMemoryQuery,
  ): Promise<Result<Memory, DomainException>> {
    const memory = await this.memoryRepository.findByIdForOwner(
      query.memoryId,
      query.ownerId,
    );

    if (!memory) {
      return Result.fail(new MemoryNotFoundException(query.memoryId));
    }

    return Result.ok(memory);
  }
}
