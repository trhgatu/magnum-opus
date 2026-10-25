import { ActivitySourceError } from '@shared/application/activity';

import type { TokenCipher } from '../../shared/application/ports/token-cipher.port';
import type {
  WakaTimeApi,
  WakaTimeDay,
  WakaTimeSession,
} from '../application/ports/wakatime-api.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import type { WakaTimeConnectionRepository } from '../domain/ports/wakatime-connection.repository';
import { WakaTimeConnection } from '../domain/wakatime-connection.entity';
import { WakaTimeActivityProvider } from './wakatime-activity.provider';

const ACCOUNT = { id: 'waka-user', username: 'trhgatu' };
const PROJECT = { id: 'project-id', name: 'magnum-opus' };
const RESOURCE = {
  ownerId: 'owner-id',
  externalAccountId: ACCOUNT.id,
  externalResourceId: PROJECT.id,
};
// 22/10 03:00 → 24/10 12:00 giờ Việt Nam.
const FROM = new Date('2026-10-21T20:00:00.000Z');
const TO = new Date('2026-10-24T05:00:00.000Z');

/** Ngày WakaTime theo giờ Việt Nam: [ngày-1 17:00Z, ngày 17:00Z). */
const wakaDay = (date: string, sessions: WakaTimeSession[] = []) => {
  const end = new Date(`${date}T17:00:00.000Z`);
  return {
    start: new Date(end.getTime() - 86_400_000),
    end,
    sessions,
  } satisfies WakaTimeDay;
};
const session = (
  start: string,
  seconds: number,
  project = PROJECT.name,
): WakaTimeSession => ({ project, start: new Date(start), seconds });

describe('WakaTimeActivityProvider', () => {
  const connections: jest.Mocked<WakaTimeConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    revokeIfKeyUnchanged: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn(),
    decrypt: jest.fn((encrypted: string) => `plain(${encrypted})`),
  };
  const api: jest.Mocked<WakaTimeApi> = {
    verifyKey: jest.fn(),
    currentUser: jest.fn(),
    listProjects: jest.fn(),
    durations: jest.fn(),
  };
  const provider = new WakaTimeActivityProvider(connections, cipher, api);

  const connection = (status: 'ACTIVE' | 'REVOKED' = 'ACTIVE') =>
    WakaTimeConnection.rehydrate({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: ACCOUNT,
      encryptedKey: 'enc-key',
      status,
      lastVerifiedAt: new Date('2026-10-24T00:00:00.000Z'),
      createdAt: new Date('2026-10-24T00:00:00.000Z'),
    });

  const days: Record<string, WakaTimeDay> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(days)) delete days[key];
    connections.findByOwner.mockResolvedValue(connection());
    api.currentUser.mockResolvedValue({
      account: ACCOUNT,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    api.listProjects.mockResolvedValue([
      { id: 'other-id', name: 'dotfiles' },
      PROJECT,
    ]);
    api.durations.mockImplementation((_, date) =>
      Promise.resolve(days[date] ?? wakaDay(date)),
    );
  });

  const fetch = () => provider.fetchEvents(RESOURCE, FROM, TO);

  describe('fetchEvents', () => {
    it('reads each touched day, newest first, with the decrypted key', async () => {
      await fetch();

      expect(api.durations.mock.calls).toEqual([
        ['plain(enc-key)', '2026-10-24'],
        ['plain(enc-key)', '2026-10-23'],
        ['plain(enc-key)', '2026-10-22'],
      ]);
      expect(api.currentUser).toHaveBeenCalledWith('plain(enc-key)');
      expect(api.listProjects).toHaveBeenCalledWith('plain(enc-key)');
    });

    it('turns the sessions of the project into coding time and reports every day it read', async () => {
      days['2026-10-23'] = wakaDay('2026-10-23', [
        session('2026-10-23T02:00:00.000Z', 2400),
        session('2026-10-23T05:00:00.000Z', 1800.4),
      ]);

      const fetched = await fetch();

      expect(fetched.displayName).toBe('magnum-opus');
      expect(fetched.events).toEqual([
        {
          kind: 'CODING_TIME',
          occurredAt: new Date('2026-10-23T02:00:00.000Z'),
          quantity: 2400,
          dedupeKey: '2026-10-23T02:00:00.000Z',
        },
        {
          kind: 'CODING_TIME',
          occurredAt: new Date('2026-10-23T05:00:00.000Z'),
          quantity: 1800,
          dedupeKey: '2026-10-23T05:00:00.000Z',
        },
      ]);
      // Cả ngày rỗng: sổ phải xóa những gì WakaTime không còn giữ.
      expect(fetched.replacedWindows).toEqual([
        {
          from: new Date('2026-10-23T17:00:00.000Z'),
          to: new Date('2026-10-24T17:00:00.000Z'),
        },
        {
          from: new Date('2026-10-22T17:00:00.000Z'),
          to: new Date('2026-10-23T17:00:00.000Z'),
        },
        {
          from: new Date('2026-10-21T17:00:00.000Z'),
          to: new Date('2026-10-22T17:00:00.000Z'),
        },
      ]);
    });

    it('keeps only sessions whose project name matches exactly', async () => {
      days['2026-10-23'] = wakaDay('2026-10-23', [
        session('2026-10-23T02:00:00.000Z', 600),
        session('2026-10-23T03:00:00.000Z', 600, 'dotfiles'),
        // Bộ lọc của WakaTime coi hai tên này là một (TQ-WAK-02).
        session('2026-10-23T04:00:00.000Z', 600, 'Magnum-Opus'),
      ]);

      const fetched = await fetch();

      expect(fetched.events.map((event) => event.occurredAt)).toEqual([
        new Date('2026-10-23T02:00:00.000Z'),
      ]);
    });

    it('clips a session to its day so no day gets time of another', async () => {
      // 23/10 23:30 → 24/10 00:30 giờ Việt Nam, trả về trong ngày 23/10.
      days['2026-10-23'] = wakaDay('2026-10-23', [
        session('2026-10-23T16:30:00.000Z', 3600),
      ]);
      // Đoạn bắt đầu trước ngày 24/10 (phần trước nửa đêm bị bỏ).
      days['2026-10-24'] = wakaDay('2026-10-24', [
        session('2026-10-23T16:50:00.000Z', 1200),
      ]);

      const fetched = await fetch();

      expect(fetched.events).toEqual([
        expect.objectContaining({
          occurredAt: new Date('2026-10-23T17:00:00.000Z'),
          quantity: 600,
        }),
        expect.objectContaining({
          occurredAt: new Date('2026-10-23T16:30:00.000Z'),
          quantity: 1800,
        }),
      ]);
    });

    it('drops a session shorter than a second — the ledger only takes quantity > 0', async () => {
      days['2026-10-23'] = wakaDay('2026-10-23', [
        session('2026-10-23T02:00:00.000Z', 0.4),
      ]);

      await expect(fetch()).resolves.toMatchObject({ events: [] });
    });

    it('follows a rename on WakaTime, since the project is found by id', async () => {
      api.listProjects.mockResolvedValue([
        { id: PROJECT.id, name: 'magnum-opus-v2' },
      ]);
      days['2026-10-23'] = wakaDay('2026-10-23', [
        session('2026-10-23T02:00:00.000Z', 600, 'magnum-opus'),
        session('2026-10-23T03:00:00.000Z', 600, 'magnum-opus-v2'),
      ]);

      const fetched = await fetch();

      expect(fetched.displayName).toBe('magnum-opus-v2');
      expect(fetched.events).toHaveLength(1);
    });

    it.each([
      ['no connection', null, 'WAKATIME_NOT_CONNECTED'],
      ['a revoked key', 'REVOKED', 'WAKATIME_KEY_INVALID'],
    ] as const)(
      'reports %s without calling WakaTime',
      async (_, status, code) => {
        connections.findByOwner.mockResolvedValue(
          status === null ? null : connection(status),
        );

        await expect(fetch()).rejects.toEqual(new ActivitySourceError(code));
        expect(api.durations).not.toHaveBeenCalled();
        expect(api.listProjects).not.toHaveBeenCalled();
      },
    );

    it('refuses a feed made under another WakaTime account', async () => {
      await expect(
        provider.fetchEvents(
          { ...RESOURCE, externalAccountId: 'previous-account' },
          FROM,
          TO,
        ),
      ).rejects.toEqual(new ActivitySourceError('WAKATIME_ACCOUNT_CHANGED'));
      expect(api.durations).not.toHaveBeenCalled();
    });

    it('reports a project that is gone from WakaTime', async () => {
      api.listProjects.mockResolvedValue([
        { id: 'other-id', name: 'dotfiles' },
      ]);

      await expect(fetch()).rejects.toEqual(
        new ActivitySourceError('WAKATIME_PROJECT_NOT_FOUND'),
      );
      expect(api.durations).not.toHaveBeenCalled();
    });

    it('revokes the key WakaTime rejected, only if it is still the same key', async () => {
      api.durations.mockRejectedValue(new WakaTimeKeyInvalidException());

      await expect(fetch()).rejects.toEqual(
        new ActivitySourceError('WAKATIME_KEY_INVALID'),
      );
      expect(connections.revokeIfKeyUnchanged).toHaveBeenCalledWith(
        'owner-id',
        'enc-key',
      );
    });

    it('passes the wait of a rate limit on', async () => {
      api.durations.mockRejectedValue(new WakaTimeRateLimitedException(30));

      const error = await fetch().catch((caught: unknown) => caught);

      expect(error).toEqual(new ActivitySourceError('WAKATIME_RATE_LIMITED'));
      expect((error as ActivitySourceError).retryAfterSeconds).toBe(30);
    });

    it('fails the whole copy when one day cannot be read', async () => {
      api.durations.mockImplementation((_, date) =>
        date === '2026-10-23'
          ? Promise.reject(new WakaTimeUnavailableException())
          : Promise.resolve(wakaDay(date)),
      );

      await expect(fetch()).rejects.toEqual(
        new ActivitySourceError('WAKATIME_UNAVAILABLE'),
      );
      expect(connections.revokeIfKeyUnchanged).not.toHaveBeenCalled();
    });

    it('lets unexpected errors surface unchanged', async () => {
      const bug = new TypeError('boom');
      api.currentUser.mockRejectedValue(bug);

      await expect(fetch()).rejects.toBe(bug);
    });
  });

  describe('resolveResource', () => {
    it('returns the current name under the connected account', async () => {
      await expect(
        provider.resolveResource('owner-id', PROJECT.id),
      ).resolves.toEqual({
        externalAccountId: ACCOUNT.id,
        displayName: 'magnum-opus',
      });
    });

    it('reports a project the account does not have', async () => {
      await expect(
        provider.resolveResource('owner-id', 'unknown-id'),
      ).rejects.toEqual(new ActivitySourceError('WAKATIME_PROJECT_NOT_FOUND'));
    });

    it('maps a rejected key like a copy does', async () => {
      api.listProjects.mockRejectedValue(new WakaTimeKeyInvalidException());

      await expect(
        provider.resolveResource('owner-id', PROJECT.id),
      ).rejects.toEqual(new ActivitySourceError('WAKATIME_KEY_INVALID'));
      expect(connections.revokeIfKeyUnchanged).toHaveBeenCalled();
    });
  });

  describe('connectedAccountId', () => {
    it('returns the stored account, even for a revoked key, without calling WakaTime', async () => {
      connections.findByOwner.mockResolvedValue(connection('REVOKED'));

      await expect(provider.connectedAccountId('owner-id')).resolves.toBe(
        ACCOUNT.id,
      );
      expect(api.currentUser).not.toHaveBeenCalled();
    });

    it('returns null without a connection', async () => {
      connections.findByOwner.mockResolvedValue(null);

      await expect(provider.connectedAccountId('owner-id')).resolves.toBeNull();
    });
  });
});
