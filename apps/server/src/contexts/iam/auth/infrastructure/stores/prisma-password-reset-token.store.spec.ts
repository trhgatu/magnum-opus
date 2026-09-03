import type { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaPasswordResetTokenStore } from './prisma-password-reset-token.store';

describe('PrismaPasswordResetTokenStore', () => {
  const createTransaction = () => ({
    passwordResetToken: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  });

  const createStore = (transaction: ReturnType<typeof createTransaction>) => {
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    return new PrismaPasswordResetTokenStore(prisma);
  };

  it('replaces any prior token for the user when issuing a new one', async () => {
    const transaction = createTransaction();
    const store = createStore(transaction);
    const expiresAt = new Date('2026-09-04T10:00:00.000Z');

    await store.issue('user-id', 'token-hash', expiresAt);

    expect(transaction.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(transaction.passwordResetToken.create).toHaveBeenCalledWith({
      data: { userId: 'user-id', tokenHash: 'token-hash', expiresAt },
    });
  });

  it('rejects a token that does not exist', async () => {
    const transaction = createTransaction();
    transaction.passwordResetToken.findUnique.mockResolvedValue(null);
    const store = createStore(transaction);

    await expect(store.consume('unknown-hash', new Date())).resolves.toBeNull();
    expect(transaction.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a token that was already consumed', async () => {
    const transaction = createTransaction();
    transaction.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      userId: 'user-id',
      expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      consumedAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    const store = createStore(transaction);

    await expect(
      store.consume('token-hash', new Date('2026-09-03T00:00:00.000Z')),
    ).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const transaction = createTransaction();
    transaction.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      userId: 'user-id',
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      consumedAt: null,
    });
    const store = createStore(transaction);

    await expect(
      store.consume('token-hash', new Date('2026-09-03T00:00:00.000Z')),
    ).resolves.toBeNull();
  });

  it('consumes a valid token exactly once', async () => {
    const transaction = createTransaction();
    const now = new Date('2026-09-03T00:00:00.000Z');
    transaction.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      userId: 'user-id',
      expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      consumedAt: null,
    });
    transaction.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    const store = createStore(transaction);

    await expect(store.consume('token-hash', now)).resolves.toBe('user-id');
    expect(transaction.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'token-id', consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
  });

  it('rejects a concurrent double-consume of the same token', async () => {
    const transaction = createTransaction();
    transaction.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-id',
      userId: 'user-id',
      expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      consumedAt: null,
    });
    transaction.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    const store = createStore(transaction);

    await expect(
      store.consume('token-hash', new Date('2026-09-03T00:00:00.000Z')),
    ).resolves.toBeNull();
  });
});
