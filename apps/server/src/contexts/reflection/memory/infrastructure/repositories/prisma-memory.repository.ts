import { Injectable } from '@nestjs/common';
import { MemoryState as PrismaMemoryState, Prisma } from '@repo/database';

import { serializeDomainEvent } from '@infrastructure/event-bus/outbox/outbox-event.mapper';
import { PrismaService } from '@infrastructure/database/prisma.service';

import { MemoryState } from '../../domain/enums';
import { Memory } from '../../domain/memory.aggregate';

import {
  FindMemoriesOptions,
  FindMemoriesResult,
  MemoryRepository,
} from '../../domain/ports/memory.repository';
import { PrismaMemoryMapper } from '../mappers/prisma-memory.mapper';

const persistenceStates: Record<MemoryState, PrismaMemoryState> = {
  [MemoryState.ACTIVE]: PrismaMemoryState.ACTIVE,
  [MemoryState.TRASHED]: PrismaMemoryState.TRASHED,
};

@Injectable()
export class PrismaMemoryRepository implements MemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(memory: Memory): Promise<void> {
    const raw = PrismaMemoryMapper.toPersistence(memory);
    const outboxEvents = memory.getDomainEvents().map(serializeDomainEvent);

    await this.prisma.$transaction(async (tx) => {
      await tx.memory.create({
        data: raw,
      });

      if (outboxEvents.length > 0) {
        await tx.outboxEvent.createMany({
          data: outboxEvents,
        });
      }
    });

    memory.clearDomainEvents();
  }

  public async update(
    memory: Memory,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaMemoryMapper.toPersistence(memory);

    const result = await this.prisma.memory.updateMany({
      where: {
        id: raw.id,
        ownerId: raw.ownerId,
        revision: expectedRevision,
      },
      data: {
        title: raw.title,
        content: raw.content,
        occurredOn: raw.occurredOn,
        occurredOnPrecision: raw.occurredOnPrecision,
        state: raw.state,
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
  ): Promise<Memory | null> {
    const raw = await this.prisma.memory.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    return raw ? PrismaMemoryMapper.toDomain(raw) : null;
  }

  public async findAllForOwner(
    ownerId: string,
    options: FindMemoriesOptions,
  ): Promise<FindMemoriesResult> {
    const search = options.search?.trim();
    const state = options.state ?? MemoryState.ACTIVE;

    const where: Prisma.MemoryWhereInput = {
      ownerId,
      state: persistenceStates[state],
      ...(options.sourceJournalEntryId
        ? { sourceJournalEntryId: options.sourceJournalEntryId }
        : {}),
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

    const orderBy = this.buildOrderBy(options);

    const [rawMemories, total] = await this.prisma.$transaction([
      this.prisma.memory.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.memory.count({
        where,
      }),
    ]);

    return {
      memories: rawMemories.map((raw) => PrismaMemoryMapper.toDomain(raw)),
      total,
    };
  }

  public async deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const result = await this.prisma.memory.deleteMany({
      where: {
        id,
        ownerId,
        revision: expectedRevision,
        state: PrismaMemoryState.TRASHED,
      },
    });
    return result.count === 1;
  }

  private buildOrderBy(
    options: FindMemoriesOptions,
  ): Prisma.MemoryOrderByWithRelationInput[] {
    const sortBy = options.sortBy ?? 'updatedAt';
    const sortOrder = options.sortOrder ?? 'desc';

    if (sortBy === 'occurredOn') {
      return [
        {
          occurredOn: {
            sort: sortOrder,
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
        {
          id: 'asc',
        },
      ];
    }

    return [
      {
        [sortBy]: sortOrder,
      },
      {
        id: 'asc',
      },
    ];
  }
}
