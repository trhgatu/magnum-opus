import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Memory } from '../../../domain/memory.aggregate';
import { MemoryOccurredOn } from '../../../domain/value-objects';
import { MemoryMutationService } from '../../services';
import { UpdateMemoryCommand } from '../update-memory.command';

@CommandHandler(UpdateMemoryCommand)
export class UpdateMemoryHandler implements ICommandHandler<
  UpdateMemoryCommand,
  Result<Memory, DomainException>
> {
  constructor(private readonly mutations: MemoryMutationService) {}

  public execute(command: UpdateMemoryCommand) {
    return this.mutations.mutate({
      memoryId: command.memoryId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (memory) =>
        memory.update({
          title: command.title,
          content: command.content,
          occurredOn: MemoryOccurredOn.rehydrate(
            command.occurredOn,
            command.occurredOnPrecision,
          ),
        }),
    });
  }
}
