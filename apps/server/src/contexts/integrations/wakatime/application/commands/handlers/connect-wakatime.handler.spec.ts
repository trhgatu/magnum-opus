import type { TokenCipher } from '../../../../shared/application/ports/token-cipher.port';
import {
  WakaTimeAccountChangeUnconfirmedException,
  WakaTimeKeyInvalidException,
} from '../../../domain/exceptions';
import type { WakaTimeConnectionRepository } from '../../../domain/ports/wakatime-connection.repository';
import { WakaTimeConnection } from '../../../domain/wakatime-connection.entity';
import type { Clock } from '../../ports/clock.port';
import type { WakaTimeApi } from '../../ports/wakatime-api.port';
import { ConnectWakaTimeCommand } from '../connect-wakatime.command';
import { ConnectWakaTimeHandler } from './connect-wakatime.handler';

const KEY = 'waka_fake-plain-key';
const NOW = new Date('2026-10-24T10:00:00.000Z');
const account = { id: 'user-uuid', username: 'trhgatu' };
const otherAccount = { id: 'other-uuid', username: 'other-account' };

describe('ConnectWakaTimeHandler', () => {
  const api: jest.Mocked<WakaTimeApi> = {
    verifyKey: jest.fn(),
    currentUser: jest.fn(),
    listProjects: jest.fn(),
    durations: jest.fn(),
  };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn((plain: string) => `enc(${plain})`),
    decrypt: jest.fn(),
  };
  const repository: jest.Mocked<WakaTimeConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    revokeIfKeyUnchanged: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const handler = new ConnectWakaTimeHandler(api, cipher, repository, clock);

  const command = (confirmAccountChange = false) =>
    new ConnectWakaTimeCommand({
      ownerId: 'owner-id',
      apiKey: KEY,
      confirmAccountChange,
    });

  const existingConnection = () =>
    WakaTimeConnection.connect({
      id: 'existing-id',
      ownerId: 'owner-id',
      account,
      encryptedKey: 'enc(old)',
      now: new Date('2026-10-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.resetAllMocks();
    cipher.encrypt.mockImplementation((plain: string) => `enc(${plain})`);
    api.verifyKey.mockResolvedValue(account);
    repository.findByOwner.mockResolvedValue(null);
    repository.insert.mockResolvedValue(true);
    repository.update.mockResolvedValue(true);
  });

  it('creates a connection and stores only the encrypted key', async () => {
    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(api.verifyKey).toHaveBeenCalledWith(KEY);
    const saved = repository.insert.mock.calls[0][0];
    expect(saved.toSnapshot()).toEqual(
      expect.objectContaining({
        ownerId: 'owner-id',
        account,
        encryptedKey: `enc(${KEY})`,
        status: 'ACTIVE',
        lastVerifiedAt: NOW,
        createdAt: NOW,
      }),
    );
  });

  it('touches nothing when WakaTime rejects the key', async () => {
    api.verifyKey.mockRejectedValue(new WakaTimeKeyInvalidException());

    const result = await handler.execute(command());

    expect(result.getError()).toBeInstanceOf(WakaTimeKeyInvalidException);
    expect(repository.findByOwner).not.toHaveBeenCalled();
    expect(cipher.encrypt).not.toHaveBeenCalled();
  });

  it('replaces the key of the same account and makes it active again', async () => {
    const existing = WakaTimeConnection.rehydrate({
      ...existingConnection().toSnapshot(),
      status: 'REVOKED',
    });
    repository.findByOwner.mockResolvedValue(existing);

    const result = await handler.execute(command());

    expect(result.getValue().toSnapshot()).toEqual(
      expect.objectContaining({
        id: 'existing-id',
        encryptedKey: `enc(${KEY})`,
        status: 'ACTIVE',
        lastVerifiedAt: NOW,
      }),
    );
    // Chỉ ghi nếu kết nối vẫn mang key lúc đọc ra.
    expect(repository.update).toHaveBeenCalledWith(existing, 'enc(old)');
  });

  it('reads again when another request replaced the key in between', async () => {
    repository.findByOwner.mockImplementation(() =>
      Promise.resolve(existingConnection()),
    );
    repository.update.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(repository.findByOwner).toHaveBeenCalledTimes(2);
    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it('asks before switching to another WakaTime account', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());
    api.verifyKey.mockResolvedValue(otherAccount);

    const result = await handler.execute(command());

    const error = result.getError();
    expect(error).toBeInstanceOf(WakaTimeAccountChangeUnconfirmedException);
    expect(error.args).toEqual({
      currentAccount: 'trhgatu',
      newAccount: 'other-account',
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('switches account once confirmed', async () => {
    repository.findByOwner.mockResolvedValue(existingConnection());
    api.verifyKey.mockResolvedValue(otherAccount);

    const result = await handler.execute(command(true));

    expect(result.getValue().account).toEqual(otherAccount);
  });

  it('retries as a replacement when another request created the connection first', async () => {
    repository.findByOwner
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingConnection());
    repository.insert.mockResolvedValue(false);

    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });
});
