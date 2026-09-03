import { HabitCheckIn as PrismaHabitCheckIn, Prisma } from '@repo/database';

import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInDate } from '../../domain/value-objects';
import { PrismaHabitCheckInMapper } from '../mappers/prisma-habit-check-in.mapper';
import { PrismaHabitCheckInRepository } from './prisma-habit-check-in.repository';

describe('PrismaHabitCheckInRepository', () => {
  const habitCheckInModel = {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  };

  const prisma = { habitCheckIn: habitCheckInModel };

  const repository = new PrismaHabitCheckInRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIfAbsent', () => {
    it('persists a new check-in', async () => {
      const checkIn = createDomainCheckIn();
      const raw = rawCheckIn();
      habitCheckInModel.create.mockResolvedValue(raw);

      const created = await repository.createIfAbsent(checkIn);

      expect(habitCheckInModel.create).toHaveBeenCalledWith({
        data: PrismaHabitCheckInMapper.toPersistence(checkIn),
      });
      expect(created.id).toBe(raw.id);
    });

    it('returns the already-persisted check-in when a concurrent request wins the unique constraint', async () => {
      const checkIn = createDomainCheckIn();
      const raw = rawCheckIn();
      habitCheckInModel.create.mockRejectedValue(uniqueConstraintError());
      habitCheckInModel.findFirst.mockResolvedValue(raw);

      const created = await repository.createIfAbsent(checkIn);

      expect(habitCheckInModel.findFirst).toHaveBeenCalledWith({
        where: {
          habitId: checkIn.habitId,
          ownerId: checkIn.ownerId,
          date: HabitCheckInDate.create(checkIn.date.value).toPersistenceDate(),
        },
      });
      expect(created.id).toBe(raw.id);
    });

    it('rethrows the unique-constraint error when no existing check-in can be found (unexpected race)', async () => {
      const checkIn = createDomainCheckIn();
      const conflict = uniqueConstraintError();
      habitCheckInModel.create.mockRejectedValue(conflict);
      habitCheckInModel.findFirst.mockResolvedValue(null);

      await expect(repository.createIfAbsent(checkIn)).rejects.toBe(conflict);
    });

    it('rethrows unexpected persistence errors without a fallback lookup', async () => {
      const checkIn = createDomainCheckIn();
      const error = new Error('database unavailable');
      habitCheckInModel.create.mockRejectedValue(error);

      await expect(repository.createIfAbsent(checkIn)).rejects.toBe(error);
      expect(habitCheckInModel.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findByHabitAndDateForOwner', () => {
    it('scopes the lookup to the persistence date, habit and owner', async () => {
      const raw = rawCheckIn();
      habitCheckInModel.findFirst.mockResolvedValue(raw);

      const found = await repository.findByHabitAndDateForOwner(
        'habit-id',
        'owner-id',
        '2026-08-24',
      );

      expect(habitCheckInModel.findFirst).toHaveBeenCalledWith({
        where: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          date: new Date('2026-08-24T00:00:00.000Z'),
        },
      });
      expect(found?.id).toBe(raw.id);
    });

    it('returns null when nothing matches', async () => {
      habitCheckInModel.findFirst.mockResolvedValue(null);

      await expect(
        repository.findByHabitAndDateForOwner(
          'habit-id',
          'owner-id',
          '2026-08-24',
        ),
      ).resolves.toBeNull();
    });
  });

  describe('deleteByHabitAndDateForOwner', () => {
    it('reports success when exactly one row is removed', async () => {
      habitCheckInModel.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.deleteByHabitAndDateForOwner(
          'habit-id',
          'owner-id',
          '2026-08-24',
        ),
      ).resolves.toBe(true);

      expect(habitCheckInModel.deleteMany).toHaveBeenCalledWith({
        where: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          date: new Date('2026-08-24T00:00:00.000Z'),
        },
      });
    });

    it('reports failure when no row matched', async () => {
      habitCheckInModel.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.deleteByHabitAndDateForOwner(
          'habit-id',
          'owner-id',
          '2026-08-24',
        ),
      ).resolves.toBe(false);
    });
  });
});

function createDomainCheckIn(): HabitCheckIn {
  return HabitCheckIn.create({
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: HabitCheckInDate.create('2026-08-24'),
    createdAt: new Date('2026-08-24T09:15:00.000Z'),
  });
}

function rawCheckIn(): PrismaHabitCheckIn {
  return {
    id: '72b45d9d-7ac6-4ec8-b3bc-5d67134b9676',
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: new Date('2026-08-24T00:00:00.000Z'),
    createdAt: new Date('2026-08-24T09:15:00.000Z'),
  };
}

function uniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
    meta: {
      target: ['habit_id', 'owner_id', 'date'],
    },
  });
}
