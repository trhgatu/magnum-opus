import {
  Mood as PrismaMood,
  MoodLabel as PrismaMoodLabel,
  Prisma,
} from '@repo/database';

import { MoodLabel } from '../../domain/enums';
import { Mood } from '../../domain/mood.aggregate';
import { MoodId } from '../../domain/value-objects';
import { PrismaMoodRepository } from './prisma-mood.repository';

describe('PrismaMoodRepository', () => {
  const moodModel = {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  };

  const prisma = {
    mood: moodModel,
  };

  const repository = new PrismaMoodRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the complete aggregate state', async () => {
      moodModel.create.mockResolvedValue(rawMood());

      const mood = createDomainMood();

      const created = await repository.create(mood);

      expect(created).toBe(true);
      expect(moodModel.create).toHaveBeenCalledWith({
        data: rawMood(),
      });
    });

    it('returns false when the Journal entry already has a Mood', async () => {
      moodModel.create.mockRejectedValue(uniqueConstraintError());

      const created = await repository.create(createDomainMood());

      expect(created).toBe(false);
    });

    it('rethrows unexpected persistence errors', async () => {
      const error = new Error('database unavailable');
      moodModel.create.mockRejectedValue(error);

      await expect(repository.create(createDomainMood())).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('updates only the owned Mood at the expected revision', async () => {
      moodModel.updateMany.mockResolvedValue({ count: 1 });

      const mood = createDomainMood();
      mood.update({
        label: MoodLabel.HOPEFUL,
        intensity: 4,
        note: 'A clearer direction',
      });

      const updated = await repository.update(mood, 'owner-1', 1);

      expect(updated).toBe(true);
      expect(moodModel.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'mood-1',
          journalEntryId: 'entry-1',
          revision: 1,
          journalEntry: {
            ownerId: 'owner-1',
          },
        },
        data: {
          label: PrismaMoodLabel.HOPEFUL,
          intensity: 4,
          note: 'A clearer direction',
          revision: 2,
          updatedAt: mood.updatedAt,
        },
      });
    });

    it('returns false when the expected revision is stale', async () => {
      moodModel.updateMany.mockResolvedValue({ count: 0 });

      const mood = createDomainMood();
      mood.update({
        label: MoodLabel.HOPEFUL,
        intensity: 4,
        note: null,
      });

      const updated = await repository.update(mood, 'owner-1', 1);

      expect(updated).toBe(false);
    });
  });

  describe('findByJournalEntryIdForOwner', () => {
    it('scopes the lookup by Journal entry and owner', async () => {
      moodModel.findFirst.mockResolvedValue(rawMood());

      const mood = await repository.findByJournalEntryIdForOwner(
        'entry-1',
        'owner-1',
      );

      expect(moodModel.findFirst).toHaveBeenCalledWith({
        where: {
          journalEntryId: 'entry-1',
          journalEntry: {
            ownerId: 'owner-1',
          },
        },
      });

      expect(mood?.id).toBe('mood-1');
      expect(mood?.journalEntryId).toBe('entry-1');
    });

    it('returns null when no owned Mood exists', async () => {
      moodModel.findFirst.mockResolvedValue(null);

      const mood = await repository.findByJournalEntryIdForOwner(
        'entry-1',
        'different-owner',
      );

      expect(mood).toBeNull();
    });
  });

  describe('deleteByJournalEntryIdForOwner', () => {
    it('deletes only the owned Mood at the expected revision', async () => {
      moodModel.deleteMany.mockResolvedValue({ count: 1 });

      const deleted = await repository.deleteByJournalEntryIdForOwner(
        'entry-1',
        'owner-1',
        4,
      );

      expect(deleted).toBe(true);
      expect(moodModel.deleteMany).toHaveBeenCalledWith({
        where: {
          journalEntryId: 'entry-1',
          revision: 4,
          journalEntry: {
            ownerId: 'owner-1',
          },
        },
      });
    });

    it('returns false when nothing matches all delete conditions', async () => {
      moodModel.deleteMany.mockResolvedValue({ count: 0 });

      const deleted = await repository.deleteByJournalEntryIdForOwner(
        'entry-1',
        'owner-1',
        3,
      );

      expect(deleted).toBe(false);
    });
  });
});

function createDomainMood(): Mood {
  return Mood.rehydrate({
    id: new MoodId('mood-1'),
    journalEntryId: 'entry-1',
    label: MoodLabel.CALM,
    intensity: 3,
    note: 'Quiet after the rain',
    revision: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}

function rawMood(): PrismaMood {
  return {
    id: 'mood-1',
    journalEntryId: 'entry-1',
    label: PrismaMoodLabel.CALM,
    intensity: 3,
    note: 'Quiet after the rain',
    revision: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };
}

function uniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
    meta: {
      target: ['journal_entry_id'],
    },
  });
}
