import { Injectable } from '@nestjs/common';
import { JournalEntryState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  MemorySourceJournalReader,
  MemorySourceJournalStatus,
} from '../../application/ports/memory-source-journal-reader.port';

@Injectable()
export class PrismaMemorySourceJournalReader implements MemorySourceJournalReader {
  constructor(private readonly prisma: PrismaService) {}

  public async getStatusForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<MemorySourceJournalStatus> {
    const journalEntry = await this.prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        ownerId,
      },
      select: {
        state: true,
      },
    });

    if (!journalEntry) {
      return MemorySourceJournalStatus.NOT_FOUND;
    }

    if (journalEntry.state === JournalEntryState.TRASHED) {
      return MemorySourceJournalStatus.TRASHED;
    }

    return MemorySourceJournalStatus.AVAILABLE;
  }
}
