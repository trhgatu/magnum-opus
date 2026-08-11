import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { Mood } from '../../domain/mood.aggregate';
import { MoodRepository } from '../../domain/ports/mood.repository';
import { PrismaMoodMapper } from '../mappers/prisma-mood.mapper';

@Injectable()
export class PrismaMoodRepository implements MoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(mood: Mood): Promise<boolean> {
    const raw = PrismaMoodMapper.toPersistence(mood);

    try {
      await this.prisma.mood.create({
        data: raw,
      });

      return true;
    } catch (error: unknown) {
      if (this.isUniqueConstraintViolation(error)) {
        return false;
      }

      throw error;
    }
  }

  public async update(
    mood: Mood,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaMoodMapper.toPersistence(mood);

    const result = await this.prisma.mood.updateMany({
      where: {
        id: raw.id,
        journalEntryId: raw.journalEntryId,
        revision: expectedRevision,
        journalEntry: {
          ownerId,
        },
      },
      data: {
        label: raw.label,
        intensity: raw.intensity,
        note: raw.note,
        revision: raw.revision,
        updatedAt: raw.updatedAt,
      },
    });

    return result.count === 1;
  }

  public async findByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<Mood | null> {
    const raw = await this.prisma.mood.findFirst({
      where: {
        journalEntryId,
        journalEntry: {
          ownerId,
        },
      },
    });

    return raw ? PrismaMoodMapper.toDomain(raw) : null;
  }

  public async deleteByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const result = await this.prisma.mood.deleteMany({
      where: {
        journalEntryId,
        revision: expectedRevision,
        journalEntry: {
          ownerId,
        },
      },
    });

    return result.count === 1;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
