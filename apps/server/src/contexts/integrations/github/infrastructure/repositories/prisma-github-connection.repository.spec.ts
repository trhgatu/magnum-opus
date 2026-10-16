import { Prisma } from '@repo/database';

import { GitHubConnection } from '../../domain/github-connection.entity';
import { PrismaGitHubConnectionRepository } from './prisma-github-connection.repository';

describe('PrismaGitHubConnectionRepository', () => {
  const integrationConnection = {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const repository = new PrismaGitHubConnectionRepository({
    integrationConnection,
  } as never);

  const row = {
    id: 'connection-id',
    ownerId: 'owner-id',
    provider: 'GITHUB',
    externalAccountId: '127409189',
    externalAccountNodeId: 'U_kgDOB5gcJQ',
    displayName: 'trhgatu',
    credentials: 'v1.encrypted',
    status: 'ACTIVE',
    expiresAt: new Date('2027-10-14T00:00:00.000Z'),
    lastVerifiedAt: new Date('2026-10-16T10:00:00.000Z'),
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-16T10:00:00.000Z'),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('findByOwner', () => {
    it('reads the GitHub connection of the owner', async () => {
      integrationConnection.findUnique.mockResolvedValue(row);

      const connection = await repository.findByOwner('owner-id');

      expect(integrationConnection.findUnique).toHaveBeenCalledWith({
        where: {
          ownerId_provider: { ownerId: 'owner-id', provider: 'GITHUB' },
        },
      });
      expect(connection?.toSnapshot()).toEqual({
        id: 'connection-id',
        ownerId: 'owner-id',
        account: { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' },
        encryptedToken: 'v1.encrypted',
        status: 'ACTIVE',
        expiresAt: new Date('2027-10-14T00:00:00.000Z'),
        lastVerifiedAt: new Date('2026-10-16T10:00:00.000Z'),
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
      });
    });

    it('returns null when there is no connection', async () => {
      integrationConnection.findUnique.mockResolvedValue(null);

      await expect(repository.findByOwner('owner-id')).resolves.toBeNull();
    });

    it('keeps a stored REVOKED status', async () => {
      integrationConnection.findUnique.mockResolvedValue({
        ...row,
        status: 'REVOKED',
      });

      const connection = await repository.findByOwner('owner-id');

      expect(connection?.statusAt(new Date('2026-10-16T10:00:00.000Z'))).toBe(
        'REVOKED',
      );
    });
  });

  describe('insert and update', () => {
    const connection = GitHubConnection.rehydrate({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' },
      encryptedToken: 'v1.encrypted',
      status: 'ACTIVE',
      expiresAt: null,
      lastVerifiedAt: new Date('2026-10-16T10:00:00.000Z'),
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    const data = {
      externalAccountId: '127409189',
      externalAccountNodeId: 'U_kgDOB5gcJQ',
      displayName: 'trhgatu',
      credentials: 'v1.encrypted',
      status: 'ACTIVE',
      expiresAt: null,
      lastVerifiedAt: new Date('2026-10-16T10:00:00.000Z'),
    };

    it('creates a first connection with its identity', async () => {
      await expect(repository.insert(connection)).resolves.toBe(true);

      expect(integrationConnection.create).toHaveBeenCalledWith({
        data: {
          id: 'connection-id',
          ownerId: 'owner-id',
          provider: 'GITHUB',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
          ...data,
        },
      });
    });

    it('reports a lost race instead of overwriting the other connection', async () => {
      integrationConnection.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(repository.insert(connection)).resolves.toBe(false);
    });

    it('lets other database errors surface', async () => {
      integrationConnection.create.mockRejectedValue(new Error('db down'));

      await expect(repository.insert(connection)).rejects.toThrow('db down');
    });

    it('updates only the mutable columns, never identity', async () => {
      integrationConnection.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.update(connection)).resolves.toBe(true);

      expect(integrationConnection.updateMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner-id', provider: 'GITHUB' },
        data,
      });
    });

    it('reports a connection that was deleted meanwhile instead of throwing', async () => {
      integrationConnection.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.update(connection)).resolves.toBe(false);
    });
  });

  describe('deleteByOwner', () => {
    it('deletes only the GitHub connection of the owner', async () => {
      await repository.deleteByOwner('owner-id');

      expect(integrationConnection.deleteMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner-id', provider: 'GITHUB' },
      });
    });
  });
});
