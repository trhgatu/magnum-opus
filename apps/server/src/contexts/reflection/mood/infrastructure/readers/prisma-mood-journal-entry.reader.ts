import { Injectable } from '@nestjs/common';
import { JournalEntryState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  type MoodJournalEntryAccess,
  MoodJournalEntryAccessStatus,
  type MoodJournalEntryReader,
} from '../../application/ports/mood-journal-entry-reader.port';

@Injectable()
export class PrismaMoodJournalEntryReader implements MoodJournalEntryReader {
  constructor(private readonly prisma: PrismaService) {}

  public async getAccessForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<MoodJournalEntryAccess> {
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
      return { status: MoodJournalEntryAccessStatus.NOT_FOUND };
    }

    if (journalEntry.state !== JournalEntryState.DRAFT) {
      return {
        status: MoodJournalEntryAccessStatus.NOT_EDITABLE,
        state: journalEntry.state,
      };
    }

    return { status: MoodJournalEntryAccessStatus.EDITABLE };
  }
}
