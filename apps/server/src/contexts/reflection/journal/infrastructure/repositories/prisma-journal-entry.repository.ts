import { Injectable } from '@nestjs/common';
import {
  JournalEntryState as PrismaJournalEntryState,
  Prisma,
} from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { JournalEntry } from '../../domain/journal-entry.aggregate';
import {
  FindJournalEntriesOptions,
  JournalEntryRepository,
} from '../../domain/ports/journal-entry.repository';
import { PrismaJournalEntryMapper } from '../mappers/prisma-journal-entry.mapper';

@Injectable()
export class PrismaJournalEntryRepository implements JournalEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(entry: JournalEntry): Promise<void> {
    const raw = PrismaJournalEntryMapper.toPersistence(entry);

    await this.prisma.journalEntry.create({
      data: raw,
    });
  }

  public async update(
    entry: JournalEntry,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaJournalEntryMapper.toPersistence(entry);

    const result = await this.prisma.journalEntry.updateMany({
      where: {
        id: raw.id,
        ownerId: raw.ownerId,
        revision: expectedRevision,
      },
      data: {
        title: raw.title,
        content: raw.content,
        state: raw.state,
        stateBeforeTrash: raw.stateBeforeTrash,
        revision: raw.revision,
        trashedAt: raw.trashedAt,
        updatedAt: raw.updatedAt,
      },
    });

    return result.count === 1;
  }

  public async findByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<JournalEntry | null> {
    const raw = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    return raw ? PrismaJournalEntryMapper.toDomain(raw) : null;
  }

  public async findAllForOwner(
    ownerId: string,
    options: FindJournalEntriesOptions,
  ): Promise<{
    entries: JournalEntry[];
    total: number;
  }> {
    const search = options.search?.trim();

    const where: Prisma.JournalEntryWhereInput = {
      ownerId,
      state: options.state
        ? (options.state as PrismaJournalEntryState)
        : { not: PrismaJournalEntryState.TRASHED },
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                content: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const sortBy = options.sortBy ?? 'updatedAt';
    const sortOrder = options.sortOrder ?? 'desc';

    const orderBy: Prisma.JournalEntryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [rawEntries, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.journalEntry.count({
        where,
      }),
    ]);

    return {
      entries: rawEntries.map((raw) => PrismaJournalEntryMapper.toDomain(raw)),
      total,
    };
  }

  public async deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const result = await this.prisma.journalEntry.deleteMany({
      where: {
        id,
        ownerId,
        revision: expectedRevision,
        state: PrismaJournalEntryState.TRASHED,
      },
    });

    return result.count === 1;
  }
}
