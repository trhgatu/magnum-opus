import { HabitCheckIn as PrismaHabitCheckIn, Prisma } from '@repo/database';
import { outboxSerializerFor } from '@infrastructure/event-bus/outbox/testing/outbox-serializer.testing';

import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInDate } from '../../domain/value-objects';
import { PrismaHabitCheckInMapper } from '../mappers/prisma-habit-check-in.mapper';
import { HabitCheckInOutbox } from '../outbox/habit-check-in.outbox';
import { PrismaHabitCheckInRepository } from './prisma-habit-check-in.repository';

describe('PrismaHabitCheckInRepository', () => {
  const calls: string[] = [];
  const track =
    <T>(name: string, value: T) =>
    () => {
      calls.push(name);
      return Promise.resolve(value);
    };

  const transactionClient = {
    habitCheckIn: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    outboxEvent: {
      createMany: jest.fn(),
    },
  };
  const habitCheckInModel = {
    findFirst: jest.fn(),
  };

  type TransactionCallback = (
    transaction: typeof transactionClient,
  ) => Promise<unknown>;

  const prisma = {
    habitCheckIn: habitCheckInModel,
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transactionClient),
    ),
  };

  const repository = new PrismaHabitCheckInRepository(
    prisma as never,
    outboxSerializerFor(HabitCheckInOutbox),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    transactionClient.outboxEvent.createMany.mockImplementation(
      track('outbox.createMany', { count: 1 }),
    );
  });

  describe('createIfAbsent', () => {
    it('persists a new check-in and its outbox event in one transaction', async () => {
      const checkIn = createDomainCheckIn();
      const raw = rawCheckIn();
      transactionClient.habitCheckIn.create.mockImplementation(
        track('habitCheckIn.create', raw),
      );

      const created = await repository.createIfAbsent(checkIn);

      expect(transactionClient.habitCheckIn.create).toHaveBeenCalledWith({
        data: PrismaHabitCheckInMapper.toPersistence(checkIn),
      });
      expect(transactionClient.outboxEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: 'forge.habit.checked-in.v1',
            aggregateId: 'habit-id',
            payload: {
              habitId: 'habit-id',
              ownerId: 'owner-id',
              date: '2026-08-24',
            },
          }),
        ],
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['habitCheckIn.create', 'outbox.createMany']);
      expect(created.id).toBe(raw.id);
    });

    // Check-in trùng ngày: transaction rollback, không phát event lần hai.
    it('returns the already-persisted check-in without a second event when a concurrent request wins', async () => {
      const checkIn = createDomainCheckIn();
      const raw = rawCheckIn();
      transactionClient.habitCheckIn.create.mockRejectedValue(
        uniqueConstraintError(),
      );
      habitCheckInModel.findFirst.mockResolvedValue(raw);

      const created = await repository.createIfAbsent(checkIn);

      expect(transactionClient.outboxEvent.createMany).not.toHaveBeenCalled();
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
      transactionClient.habitCheckIn.create.mockRejectedValue(conflict);
      habitCheckInModel.findFirst.mockResolvedValue(null);

      await expect(repository.createIfAbsent(checkIn)).rejects.toBe(conflict);
    });

    it('rethrows unexpected persistence errors without a fallback lookup', async () => {
      const checkIn = createDomainCheckIn();
      const error = new Error('database unavailable');
      transactionClient.habitCheckIn.create.mockRejectedValue(error);

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

  describe('delete', () => {
    it('removes the check-in and records its undo in one transaction', async () => {
      const checkIn = undoneCheckIn();
      transactionClient.habitCheckIn.deleteMany.mockImplementation(
        track('habitCheckIn.deleteMany', { count: 1 }),
      );

      await expect(repository.delete(checkIn)).resolves.toBe(true);

      expect(transactionClient.habitCheckIn.deleteMany).toHaveBeenCalledWith({
        where: { id: checkIn.id, ownerId: 'owner-id' },
      });
      expect(transactionClient.outboxEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: 'forge.habit.check-in-undone.v1',
            aggregateId: 'habit-id',
            payload: {
              habitId: 'habit-id',
              ownerId: 'owner-id',
              date: '2026-08-24',
            },
          }),
        ],
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['habitCheckIn.deleteMany', 'outbox.createMany']);
    });

    // Hai lần undo đua nhau: chỉ lần xóa được dòng mới phát event.
    it('records no undo when another request already removed the check-in', async () => {
      transactionClient.habitCheckIn.deleteMany.mockResolvedValue({
        count: 0,
      });

      await expect(repository.delete(undoneCheckIn())).resolves.toBe(false);

      expect(transactionClient.outboxEvent.createMany).not.toHaveBeenCalled();
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

function undoneCheckIn(): HabitCheckIn {
  const checkIn = PrismaHabitCheckInMapper.toDomain(rawCheckIn());
  checkIn.undo();
  return checkIn;
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
