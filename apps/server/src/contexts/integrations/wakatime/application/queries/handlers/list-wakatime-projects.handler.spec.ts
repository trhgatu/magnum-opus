import type { TokenCipher } from '../../../../shared/application/ports/token-cipher.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeNotConnectedException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../../../domain/exceptions';
import type { WakaTimeConnectionRepository } from '../../../domain/ports/wakatime-connection.repository';
import { WakaTimeConnection } from '../../../domain/wakatime-connection.entity';
import type {
  WakaTimeApi,
  WakaTimeProject,
} from '../../ports/wakatime-api.port';
import { ListWakaTimeProjectsQuery } from '../list-wakatime-projects.query';
import { ListWakaTimeProjectsHandler } from './list-wakatime-projects.handler';

const project = (
  id: string,
  name: string,
  lastHeartbeatAt: string | null,
): WakaTimeProject => ({
  id,
  name,
  lastHeartbeatAt: lastHeartbeatAt ? new Date(lastHeartbeatAt) : null,
});

describe('ListWakaTimeProjectsHandler', () => {
  const api: jest.Mocked<WakaTimeApi> = {
    verifyKey: jest.fn(),
    currentUser: jest.fn(),
    listProjects: jest.fn(),
    durations: jest.fn(),
  };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn(),
    decrypt: jest.fn((encrypted: string) => `plain(${encrypted})`),
  };
  const connections: jest.Mocked<WakaTimeConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    revokeIfKeyUnchanged: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const usage = { usedByProjects: jest.fn() };
  const handler = new ListWakaTimeProjectsHandler(
    api,
    cipher,
    connections,
    usage,
  );

  const connection = (status: 'ACTIVE' | 'REVOKED' = 'ACTIVE') =>
    WakaTimeConnection.rehydrate({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: { id: 'waka-user', username: 'trhgatu' },
      encryptedKey: 'enc-key',
      status,
      lastVerifiedAt: new Date('2026-10-24T00:00:00.000Z'),
      createdAt: new Date('2026-10-24T00:00:00.000Z'),
    });

  const list = (search?: string) =>
    handler.execute(
      new ListWakaTimeProjectsQuery({ ownerId: 'owner-id', search }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    connections.findByOwner.mockResolvedValue(connection());
    usage.usedByProjects.mockResolvedValue({});
  });

  it('lists projects, most recently coded first, with the projects using them', async () => {
    api.listProjects.mockResolvedValue([
      project('p1', 'dotfiles', '2026-10-01T00:00:00Z'),
      project('p2', 'scratch', null),
      project('p3', 'magnum-opus', '2026-10-24T09:00:00Z'),
    ]);
    usage.usedByProjects.mockResolvedValue({
      p3: [{ id: 'project-1', title: 'Magnum Opus' }],
    });

    const result = await list();

    expect(result.unwrap()).toEqual({
      // Chưa có dữ liệu bao giờ thì xếp cuối.
      projects: [
        project('p3', 'magnum-opus', '2026-10-24T09:00:00Z'),
        project('p1', 'dotfiles', '2026-10-01T00:00:00Z'),
        project('p2', 'scratch', null),
      ],
      usedByProjects: { p3: [{ id: 'project-1', title: 'Magnum Opus' }] },
    });
    expect(api.listProjects).toHaveBeenCalledWith('plain(enc-key)');
    expect(usage.usedByProjects).toHaveBeenCalledWith('owner-id', 'WAKATIME', [
      'p3',
      'p1',
      'p2',
    ]);
  });

  it('filters by name, ignoring case and surrounding spaces', async () => {
    api.listProjects.mockResolvedValue([
      project('p1', 'Magnum-Opus', null),
      project('p2', 'dotfiles', null),
    ]);

    const result = await list('  opus ');

    expect(result.unwrap().projects.map((p) => p.id)).toEqual(['p1']);
    // Chỉ hỏi cách dùng của những project được trả về.
    expect(usage.usedByProjects).toHaveBeenCalledWith('owner-id', 'WAKATIME', [
      'p1',
    ]);
  });

  it.each([
    ['not connected', null],
    ['connected with a revoked key', 'REVOKED'],
  ] as const)(
    'answers WAKATIME_NOT_CONNECTED when %s, without calling WakaTime',
    async (_, status) => {
      connections.findByOwner.mockResolvedValue(
        status === null ? null : connection(status),
      );

      const result = await list();

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(WakaTimeNotConnectedException);
      expect(api.listProjects).not.toHaveBeenCalled();
    },
  );

  it('revokes a key WakaTime rejected, only if it is still the same key', async () => {
    api.listProjects.mockRejectedValue(new WakaTimeKeyInvalidException());

    const result = await list();

    expect(result.getError()).toBeInstanceOf(WakaTimeNotConnectedException);
    expect(connections.revokeIfKeyUnchanged).toHaveBeenCalledWith(
      'owner-id',
      'enc-key',
    );
  });

  it.each([
    ['a rate limit', new WakaTimeRateLimitedException(30)],
    ['an outage', new WakaTimeUnavailableException()],
  ])('passes %s on without revoking the key', async (_, error) => {
    api.listProjects.mockRejectedValue(error);

    const result = await list();

    expect(result.getError()).toBe(error);
    expect(connections.revokeIfKeyUnchanged).not.toHaveBeenCalled();
  });

  it('lets unexpected errors surface', async () => {
    const bug = new TypeError('boom');
    api.listProjects.mockRejectedValue(bug);

    await expect(list()).rejects.toBe(bug);
  });
});
