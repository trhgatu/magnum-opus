import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { MemoryState } from '../../../domain/enums';
import {
  MemoryNotFoundException,
  MemoryPermanentDeleteForbiddenException,
  MemoryRevisionConflictException,
} from '../../../domain/exceptions';
import {
  MEMORY_REPOSITORY,
  type MemoryRepository,
} from '../../../domain/ports/memory.repository';
import { DeleteMemoryCommand } from '../delete-memory.command';

@CommandHandler(DeleteMemoryCommand)
export class DeleteMemoryHandler implements ICommandHandler<
  DeleteMemoryCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: MemoryRepository,
  ) {}

  public async execute(
    command: DeleteMemoryCommand,
  ): Promise<Result<void, DomainException>> {
    const memory = await this.memoryRepository.findByIdForOwner(
      command.memoryId,
      command.ownerId,
    );

    if (!memory) {
      return Result.fail(new MemoryNotFoundException(command.memoryId));
    }
    if (memory.revision !== command.expectedRevision) {
      return Result.fail(
        new MemoryRevisionConflictException(
          command.memoryId,
          command.expectedRevision,
        ),
      );
    }
    if (memory.state !== MemoryState.TRASHED) {
      return Result.fail(
        new MemoryPermanentDeleteForbiddenException(command.memoryId),
      );
    }

    const deleted = await this.memoryRepository.deletePermanently(
      command.memoryId,
      command.ownerId,
      command.expectedRevision,
    );

    if (!deleted) {
      return Result.fail(
        new MemoryRevisionConflictException(
          command.memoryId,
          command.expectedRevision,
        ),
      );
    }

    return Result.ok(undefined);
  }
}
