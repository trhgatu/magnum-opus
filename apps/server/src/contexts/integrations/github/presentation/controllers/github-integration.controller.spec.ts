import { HttpStatus } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import {
  ConnectGitHubCommand,
  DisconnectGitHubCommand,
} from '../../application/commands';
import {
  GetGitHubConnectionQuery,
  ListGitHubRepositoriesQuery,
} from '../../application/queries';
import {
  GitHubNotConnectedException,
  GitHubTokenInvalidException,
} from '../../domain/exceptions';
import { GitHubConnection } from '../../domain/github-connection.entity';
import { GitHubIntegrationController } from './github-integration.controller';

describe('GitHubIntegrationController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const now = new Date('2026-10-16T10:00:00.000Z');
  const controller = new GitHubIntegrationController(
    commandBus as never,
    queryBus as never,
    { now: () => now },
  );

  const connection = GitHubConnection.connect({
    id: 'connection-id',
    ownerId: 'owner-id',
    account: { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' },
    encryptedToken: 'v1.cipher',
    expiresAt: null,
    now,
  });

  const response = () => ({ status: jest.fn() });

  beforeEach(() => jest.clearAllMocks());

  describe('GET', () => {
    it('presents the connection of the authenticated owner', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(connection));
      const res = response();

      const body = await controller.getConnection('owner-id', res as never);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetGitHubConnectionQuery({ ownerId: 'owner-id' }),
      );
      expect(body).toMatchObject({ accountLogin: 'trhgatu', status: 'ACTIVE' });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('answers 204 with no body when GitHub is not connected', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(null));
      const res = response();

      const body = await controller.getConnection('owner-id', res as never);

      expect(body).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
    });
  });

  describe('PUT', () => {
    it('connects with the token for the authenticated owner', async () => {
      commandBus.execute.mockResolvedValue(Result.ok(connection));

      const body = await controller.connect('owner-id', {
        token: 'fake-token',
        confirmAccountChange: true,
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        new ConnectGitHubCommand({
          ownerId: 'owner-id',
          token: 'fake-token',
          confirmAccountChange: true,
        }),
      );
      expect(body.accountLogin).toBe('trhgatu');
    });

    it('treats a missing confirmation as not confirmed', async () => {
      commandBus.execute.mockResolvedValue(Result.ok(connection));

      await controller.connect('owner-id', { token: 'fake-token' });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ confirmAccountChange: false }),
      );
    });

    it('surfaces a domain failure instead of returning it', async () => {
      const failure = new GitHubTokenInvalidException();
      commandBus.execute.mockResolvedValue(Result.fail(failure));

      await expect(
        controller.connect('owner-id', { token: 'bad' }),
      ).rejects.toBe(failure);
    });
  });

  describe('GET /repositories', () => {
    const selection = {
      repositories: [
        {
          id: '1067270000',
          fullName: 'trhgatu/magnum-opus',
          isPrivate: false,
          pushedAt: null,
        },
      ],
      truncated: false,
    };

    it('lists repositories of the authenticated owner, filtered by search', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(selection));

      const body = await controller.listRepositories('owner-id', {
        search: 'opus',
      });

      expect(queryBus.execute).toHaveBeenCalledWith(
        new ListGitHubRepositoriesQuery({
          ownerId: 'owner-id',
          search: 'opus',
        }),
      );
      expect(body.repositories[0].externalResourceId).toBe('1067270000');
      expect(body.truncated).toBe(false);
    });

    it('lists without a filter when no search is given', async () => {
      queryBus.execute.mockResolvedValue(Result.ok(selection));

      await controller.listRepositories('owner-id', {});

      expect(queryBus.execute).toHaveBeenCalledWith(
        new ListGitHubRepositoriesQuery({ ownerId: 'owner-id' }),
      );
    });

    it('surfaces a domain failure instead of returning it', async () => {
      const failure = new GitHubNotConnectedException();
      queryBus.execute.mockResolvedValue(Result.fail(failure));

      await expect(controller.listRepositories('owner-id', {})).rejects.toBe(
        failure,
      );
    });
  });

  describe('DELETE', () => {
    it('disconnects the authenticated owner and returns no body', async () => {
      commandBus.execute.mockResolvedValue(Result.ok(undefined));

      const body = await controller.disconnect('owner-id');

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DisconnectGitHubCommand({ ownerId: 'owner-id' }),
      );
      expect(body).toBeUndefined();
    });
  });
});
