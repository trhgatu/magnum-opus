import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { MemoryMutationService } from '../../services';
import { TrashMemoryCommand } from '../trash-memory.command';

@CommandHandler(TrashMemoryCommand)
export class TrashMemoryHandler implements ICommandHandler<TrashMemoryCommand> {
  constructor(private readonly mutations: MemoryMutationService) {}

  public execute(command: TrashMemoryCommand) {
    return this.mutations.mutate({
      memoryId: command.memoryId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (memory) => memory.moveToTrash(),
    });
  }
}
