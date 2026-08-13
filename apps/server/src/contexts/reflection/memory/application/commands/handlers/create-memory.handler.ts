import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  MEMORY_REPOSITORY,
  type MemoryRepository,
} from '../../../domain/ports/memory.repository';
import { Memory } from '../../../domain/memory.aggregate';
import {
  InvalidMemorySourceJournalException,
  MemorySourceJournalNotFoundException,
} from '../../../domain/exceptions';
import { MemoryOccurredOn } from '../../../domain/value-objects';
import {
  MEMORY_SOURCE_JOURNAL_READER,
  type MemorySourceJournalReader,
  MemorySourceJournalStatus,
} from '../../ports/memory-source-journal-reader.port';
import { CreateMemoryCommand } from '../create-memory.command';

@CommandHandler(CreateMemoryCommand)
export class CreateMemoryHandler implements ICommandHandler<
  CreateMemoryCommand,
  Result<Memory, DomainException>
> {
  constructor(
    @Inject(MEMORY_REPOSITORY)
    private readonly memoryRepository: MemoryRepository,
    @Inject(MEMORY_SOURCE_JOURNAL_READER)
    private readonly sourceJournalReader: MemorySourceJournalReader,
  ) {}

  public async execute(
    command: CreateMemoryCommand,
  ): Promise<Result<Memory, DomainException>> {
    await this.ensureValidSource(command.sourceJournalEntryId, command.ownerId);

    const occurredOn = MemoryOccurredOn.rehydrate(
      command.occurredOn,
      command.occurredOnPrecision,
    );
    const memory = Memory.create({
      ownerId: command.ownerId,
      sourceJournalEntryId: command.sourceJournalEntryId,
      title: command.title,
      content: command.content,
      occurredOn,
    });

    await this.memoryRepository.create(memory);

    return Result.ok(memory);
  }

  private async ensureValidSource(
    journalEntryId: string | null,
    ownerId: string,
  ): Promise<void> {
    if (!journalEntryId) {
      return;
    }

    const status = await this.sourceJournalReader.getStatusForOwner(
      journalEntryId,
      ownerId,
    );

    if (status === MemorySourceJournalStatus.NOT_FOUND) {
      throw new MemorySourceJournalNotFoundException(journalEntryId);
    }

    if (status === MemorySourceJournalStatus.TRASHED) {
      throw new InvalidMemorySourceJournalException(journalEntryId);
    }
  }
}
