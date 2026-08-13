import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { MemoryMutationService } from '../../services';
import { RestoreMemoryCommand } from '../restore-memory.command';

@CommandHandler(RestoreMemoryCommand)
export class RestoreMemoryHandler implements ICommandHandler<RestoreMemoryCommand> {
  constructor(private readonly mutations: MemoryMutationService) {}

  public execute(command: RestoreMemoryCommand) {
    return this.mutations.mutate({
      memoryId: command.memoryId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (memory) => memory.restore(),
    });
  }
}
