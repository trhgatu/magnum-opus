import { Injectable } from '@nestjs/common';
import { Prisma, TimelineEntryType } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { TimelineWriter } from '../../application/ports/timeline-writer.port';

@Injectable()
export class PrismaTimelineWriter implements TimelineWriter {
  constructor(private readonly prisma: PrismaService) {}

  async recordJournalSealed(
    ownerId: string,
    journalEntryId: string,
    sealedAt: Date,
  ): Promise<void> {
    await this.insert('JOURNAL_SEALED', journalEntryId, ownerId, sealedAt);
  }

  async recordMemoryCreated(
    ownerId: string,
    memoryId: string,
    memoryOccurredOn: Date | null,
  ): Promise<void> {
    await this.insert(
      'MEMORY_CREATED',
      memoryId,
      ownerId,
      memoryOccurredOn ?? new Date(),
    );
  }

  private async insert(
    entryType: TimelineEntryType,
    sourceId: string,
    ownerId: string,
    occurredOn: Date,
  ): Promise<void> {
    try {
      await this.prisma.reflectionTimelineEntry.create({
        data: { entryType, sourceId, ownerId, occurredOn },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }
}
