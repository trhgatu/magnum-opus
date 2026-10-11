import type { PrismaService } from '@infrastructure/database/prisma.service';
import { UserEntity } from '../../domain/user.entity';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository administrator invariant', () => {
  it('locks and rejects removing the only active administrator before writing', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findFirst: jest.fn().mockResolvedValue({
          isActive: true,
          isDeleted: false,
          userRoles: [{ roleId: 'admin-role-id' }],
        }),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn(),
      },
      userRole: { deleteMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<boolean>) =>
          callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaUserRepository(prisma);
    const administrator = UserEntity.register({
      id: 'admin-id',
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'hashed-password',
      roles: ['ADMIN'],
    });
    administrator.updateRoles(['USER']);

    await expect(
      repository.savePreservingLastAdministrator(administrator),
    ).resolves.toBe(false);

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.user.count).toHaveBeenCalledTimes(1);
    expect(transaction.user.upsert).not.toHaveBeenCalled();
    expect(transaction.userRole.deleteMany).not.toHaveBeenCalled();
  });
});

describe('PrismaUserRepository.changePassword', () => {
  it('updates only an active credential and increments tokenVersion atomically', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaUserRepository({
      user: { updateMany },
    } as unknown as PrismaService);

    await expect(
      repository.changePassword('user-id', 'new-hash'),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-id', isActive: true, isDeleted: false },
      data: {
        password: 'new-hash',
        tokenVersion: { increment: 1 },
        updatedAt: expect.any(Date),
      },
    });
  });
});

describe('PrismaUserRepository.changeTimeZone', () => {
  it('writes only the time zone column and records who changed it', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new PrismaUserRepository({
      user: { updateMany },
    } as unknown as PrismaService);

    await expect(
      repository.changeTimeZone('user-id', 'Asia/Ho_Chi_Minh', 'user-id'),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-id', isDeleted: false },
      data: {
        timeZone: 'Asia/Ho_Chi_Minh',
        updatedBy: 'user-id',
        updatedAt: expect.any(Date),
      },
    });
  });

  it('reports a missing or deleted user', async () => {
    const repository = new PrismaUserRepository({
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaService);

    await expect(
      repository.changeTimeZone('gone', 'UTC', 'gone'),
    ).resolves.toBe(false);
  });
});

describe('PrismaUserRepository.save', () => {
  it('never overwrites the time zone of an existing user', async () => {
    // A profile/role save works on a snapshot loaded earlier; writing its
    // time zone back could revert a newer choice made in the meantime.
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-id' }),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      userRole: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      role: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      outboxEvent: { createMany: jest.fn() },
    };
    const repository = new PrismaUserRepository({
      $transaction: (run: (client: typeof tx) => Promise<void>) => run(tx),
    } as unknown as PrismaService);
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    await repository.save(user);

    const [{ update, create }] = tx.user.upsert.mock.calls[0];
    expect(update).not.toHaveProperty('timeZone');
    expect(create).toMatchObject({ timeZone: 'Asia/Ho_Chi_Minh' });
  });
});
