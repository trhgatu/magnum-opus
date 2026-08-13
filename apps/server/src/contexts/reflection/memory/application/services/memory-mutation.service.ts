import { Inject, Injectable } from '@nestjs/common';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  MemoryNotFoundException,
  MemoryRevisionConflictException,
} from '../../domain/exceptions';
import { Memory } from '../../domain/memory.aggregate';
import {
  MEMORY_REPOSITORY,
  type MemoryRepository,
} from '../../domain/ports/memory.repository';

export interface MemoryMutationInput {
  memoryId: string;
  ownerId: string;
  expectedRevision: number;
  mutate: (memory: Memory) => void;
}

@Injectable()
export class MemoryMutationService {
  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: MemoryRepository,
  ) {}

  public async mutate(
    input: MemoryMutationInput,
  ): Promise<Result<Memory, DomainException>> {
    const memory = await this.memoryRepository.findByIdForOwner(
      input.memoryId,
      input.ownerId,
    );

    if (!memory)
      return Result.fail(new MemoryNotFoundException(input.memoryId));

    if (memory.revision !== input.expectedRevision) {
      return Result.fail(
        new MemoryRevisionConflictException(
          input.memoryId,
          input.expectedRevision,
        ),
      );
    }

    try {
      input.mutate(memory);
    } catch (error: unknown) {
      if (error instanceof DomainException) return Result.fail(error);
      throw error;
    }

    if (memory.revision === input.expectedRevision) return Result.ok(memory);

    const updated = await this.memoryRepository.update(
      memory,
      input.expectedRevision,
    );

    return updated
      ? Result.ok(memory)
      : Result.fail(
          new MemoryRevisionConflictException(
            input.memoryId,
            input.expectedRevision,
          ),
        );
  }
}
