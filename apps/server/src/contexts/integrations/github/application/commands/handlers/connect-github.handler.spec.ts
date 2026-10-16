import type { GitHubApi } from '../../ports/github-api.port';
import type { TokenCipher } from '../../ports/token-cipher.port';
import type { Clock } from '../../ports/clock.port';
import type { GitHubConnectionRepository } from '../../../domain/ports/github-connection.repository';
import { GitHubConnection } from '../../../domain/github-connection.entity';
import {
  GitHubAccountChangeUnconfirmedException,
  GitHubTokenInvalidException,
} from '../../../domain/exceptions';
import { ConnectGitHubCommand } from '../connect-github.command';
import { ConnectGitHubHandler } from './connect-github.handler';

const TOKEN = 'fake-plain-token';
const NOW = new Date('2026-10-16T10:00:00.000Z');
const account = { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' };
const otherAccount = { id: '555', nodeId: 'U_other', login: 'other-account' };

describe('ConnectGitHubHandler', () => {
  const api: jest.Mocked<GitHubApi> = { verifyToken: jest.fn() };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn((plain: string) => `enc(${plain})`),
    decrypt: jest.fn(),
  };
  const repository: jest.Mocked<GitHubConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const handler = new ConnectGitHubHandler(api, cipher, repository, clock);

  const command = (confirmAccountChange = false) =>
    new ConnectGitHubCommand({
      ownerId: 'owner-id',
      token: TOKEN,
      confirmAccountChange,
    });

  const existingConnection = () =>
    GitHubConnection.connect({
      id: 'existing-id',
      ownerId: 'owner-id',
      account,
      encryptedToken: 'enc(old)',
      expiresAt: null,
      now: new Date('2026-09-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    api.verifyToken.mockResolvedValue({
      account,
      expiresAt: new Date('2027-10-14T00:00:00.000Z'),
    });
    repository.findByOwner.mockResolvedValue(null);
    repository.insert.mockResolvedValue(true);
  });

  it('creates a connection for a first-time owner and stores only the encrypted token', async () => {
    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(api.verifyToken).toHaveBeenCalledWith(TOKEN);
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.update).not.toHaveBeenCalled();

    const saved = repository.insert.mock.calls[0][0];
    expect(saved.ownerId).toBe('owner-id');
    expect(saved.account).toEqual(account);
    expect(saved.encryptedToken).toBe(`enc(${TOKEN})`);
    expect(saved.expiresAt).toEqual(new Date('2027-10-14T00:00:00.000Z'));
    expect(saved.statusAt(NOW)).toBe('ACTIVE');
    expect(saved.createdAt).toEqual(NOW);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.encryptedToken).not.toBe(TOKEN);
  });

  it('replaces the token of the same account, keeping identity and history', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());

    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(repository.insert).not.toHaveBeenCalled();
    const saved = repository.update.mock.calls[0][0];
    expect(saved.id).toBe('existing-id');
    expect(saved.createdAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(saved.encryptedToken).toBe(`enc(${TOKEN})`);
    expect(saved.lastVerifiedAt).toEqual(NOW);
  });

  it('refuses a token of another account unless confirmed, saving nothing', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());
    api.verifyToken.mockResolvedValue({
      account: otherAccount,
      expiresAt: null,
    });

    const result = await handler.execute(command(false));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(
      GitHubAccountChangeUnconfirmedException,
    );
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('switches to another account when confirmed', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());
    api.verifyToken.mockResolvedValue({
      account: otherAccount,
      expiresAt: null,
    });

    const result = await handler.execute(command(true));

    expect(result.isSuccess).toBe(true);
    expect(repository.update.mock.calls[0][0].account).toEqual(otherAccount);
  });

  it('fails without touching storage when GitHub rejects the token', async () => {
    api.verifyToken.mockRejectedValue(new GitHubTokenInvalidException());

    const result = await handler.execute(command());

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(GitHubTokenInvalidException);
    expect(cipher.encrypt).not.toHaveBeenCalled();
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('keeps an existing connection untouched when the new token is rejected', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());
    api.verifyToken.mockRejectedValue(new GitHubTokenInvalidException());

    await handler.execute(command());

    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  describe('two first-time connections at once', () => {
    it('treats a lost insert race as a token replacement, not an overwrite', async () => {
      // Lần đọc đầu: chưa có. Insert thua race. Lần đọc sau: kết nối do
      // request kia vừa tạo, cùng tài khoản.
      repository.findByOwner
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingConnection());
      repository.insert.mockResolvedValue(false);

      const result = await handler.execute(command());

      expect(result.isSuccess).toBe(true);
      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update.mock.calls[0][0].id).toBe('existing-id');
    });

    it('still requires confirmation when the other request connected another account', async () => {
      const concurrent = GitHubConnection.connect({
        id: 'concurrent-id',
        ownerId: 'owner-id',
        account: otherAccount,
        encryptedToken: 'enc(other)',
        expiresAt: null,
        now: NOW,
      });
      repository.findByOwner
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(concurrent);
      repository.insert.mockResolvedValue(false);

      const result = await handler.execute(command(false));

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(
        GitHubAccountChangeUnconfirmedException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  it('lets unexpected errors surface instead of turning them into a result', async () => {
    repository.findByOwner.mockRejectedValue(new Error('database down'));

    await expect(handler.execute(command())).rejects.toThrow('database down');
  });
});
