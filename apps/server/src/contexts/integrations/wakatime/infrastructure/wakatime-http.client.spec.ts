import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import { WakaTimeHttpClient } from './wakatime-http.client';

const KEY = 'waka_fake-secret-key-never-logged';

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const client = (...responses: Response[]) => {
  const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  for (const response of responses) fetchFn.mockResolvedValueOnce(response);
  return {
    fetchFn,
    client: new WakaTimeHttpClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://wakatime.test/api/v1',
    }),
  };
};
const urlOf = (fetchFn: jest.Mock, call: number) =>
  fetchFn.mock.calls[call][0] as string;

describe('WakaTimeHttpClient.verifyKey', () => {
  const setup = (response: Response | Error) => {
    const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    if (response instanceof Error) fetchFn.mockRejectedValueOnce(response);
    else fetchFn.mockResolvedValueOnce(response);
    const client = new WakaTimeHttpClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://wakatime.test/api/v1',
    });
    return { client, fetchFn };
  };

  it('returns the account that owns the key, sending it as Basic auth', async () => {
    const { client, fetchFn } = setup(
      json(200, { data: { id: 'user-uuid', username: 'trhgatu' } }),
    );

    await expect(client.verifyKey(KEY)).resolves.toEqual({
      id: 'user-uuid',
      username: 'trhgatu',
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://wakatime.test/api/v1/users/current');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(
      `Basic ${Buffer.from(KEY).toString('base64')}`,
    );
    expect(headers.get('user-agent')).toBeTruthy();
  });

  it('falls back to the display name, then the id, without a username', async () => {
    await expect(
      setup(
        json(200, { data: { id: 'u1', username: null, display_name: 'Tú' } }),
      ).client.verifyKey(KEY),
    ).resolves.toEqual({ id: 'u1', username: 'Tú' });
    await expect(
      setup(json(200, { data: { id: 'u2' } })).client.verifyKey(KEY),
    ).resolves.toEqual({ id: 'u2', username: 'u2' });
    await expect(
      setup(
        json(200, { data: { id: 'u3', username: { nested: true } } }),
      ).client.verifyKey(KEY),
    ).resolves.toEqual({ id: 'u3', username: 'u3' });
  });

  it.each([401, 403])(
    'rejects a key WakaTime answers %i to',
    async (status) => {
      await expect(
        setup(json(status, { error: 'Unauthorized.' })).client.verifyKey(KEY),
      ).rejects.toBeInstanceOf(WakaTimeKeyInvalidException);
    },
  );

  it('reports the rate limit with the wait from Retry-After', async () => {
    const error = await setup(json(429, {}, { 'retry-after': '30' }))
      .client.verifyKey(KEY)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WakaTimeRateLimitedException);
    expect((error as WakaTimeRateLimitedException).args).toEqual({
      retryAfter: 30,
    });
  });

  it.each([
    ['a server error', json(500, {})],
    ['a body without an account', json(200, { data: {} })],
    ['an id that is not a string', json(200, { data: { id: 42 } })],
    ['a body that is not an object', json(200, ['user'])],
    ['a network failure', new Error(`connect failed for ${KEY}`)],
  ])('treats %s as unavailable, never leaking the key', async (_, response) => {
    const error = await setup(response)
      .client.verifyKey(KEY)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(WakaTimeUnavailableException);
    expect(JSON.stringify(error)).not.toContain(KEY);
    expect((error as Error).message).not.toContain(KEY);
  });
});

describe('WakaTimeHttpClient.currentUser', () => {
  it('returns the account with the time zone WakaTime splits days by', async () => {
    const { client: api } = client(
      json(200, {
        data: { id: 'u1', username: 'trhgatu', timezone: 'Asia/Ho_Chi_Minh' },
      }),
    );

    await expect(api.currentUser(KEY)).resolves.toEqual({
      account: { id: 'u1', username: 'trhgatu' },
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  });

  it.each([
    ['missing', undefined],
    ['unknown to Intl', 'Mars/Olympus_Mons'],
    ['not a string', 7],
  ])('falls back to UTC when the time zone is %s', async (_, timezone) => {
    const { client: api } = client(json(200, { data: { id: 'u1', timezone } }));

    await expect(api.currentUser(KEY)).resolves.toMatchObject({
      timeZone: 'UTC',
    });
  });
});

describe('WakaTimeHttpClient.listProjects', () => {
  it('reads every page while WakaTime points at a next one', async () => {
    const { client: api, fetchFn } = client(
      json(200, {
        data: [{ id: 'p1', name: 'magnum-opus' }],
        next_page: 2,
      }),
      json(200, { data: [{ id: 'p2', name: 'dotfiles' }], next_page: null }),
    );

    await expect(api.listProjects(KEY)).resolves.toEqual([
      { id: 'p1', name: 'magnum-opus' },
      { id: 'p2', name: 'dotfiles' },
    ]);
    expect(urlOf(fetchFn, 0)).toBe(
      'https://wakatime.test/api/v1/users/current/projects?page=1',
    );
    expect(urlOf(fetchFn, 1)).toBe(
      'https://wakatime.test/api/v1/users/current/projects?page=2',
    );
  });

  it('reads one page when there is no next_page', async () => {
    const { client: api, fetchFn } = client(
      json(200, { data: [{ id: 'p1', name: 'magnum-opus' }] }),
    );

    await expect(api.listProjects(KEY)).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('skips projects without a usable id or name', async () => {
    const { client: api } = client(
      json(200, {
        data: [
          { id: 'p1', name: 'magnum-opus' },
          { id: 'p2', name: '' },
          { id: 3, name: 'numeric-id' },
          'not-an-object',
        ],
      }),
    );

    await expect(api.listProjects(KEY)).resolves.toEqual([
      { id: 'p1', name: 'magnum-opus' },
    ]);
  });

  it('stops following pages that never end', async () => {
    const fetchFn = jest.fn(() =>
      Promise.resolve(json(200, { data: [], next_page: 1 })),
    );
    const api = new WakaTimeHttpClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://wakatime.test/api/v1',
    });

    await expect(api.listProjects(KEY)).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(50);
  });
});

describe('WakaTimeHttpClient.durations', () => {
  // Đúng hình dạng probe ngày 24/10 (Asia/Ho_Chi_Minh).
  const day = (data: unknown[]) =>
    json(200, {
      data,
      start: '2026-10-23T17:00:00Z',
      end: '2026-10-24T16:59:59Z',
      timezone: 'Asia/Ho_Chi_Minh',
    });

  it('returns the day as [start, end) and keeps only project, start and length', async () => {
    const { client: api, fetchFn } = client(
      day([
        {
          project: 'magnum-opus',
          time: 1_792_818_000.5,
          duration: 2400.25,
          // Mọi trường khác bị bỏ (BR-PAC-043).
          language: 'TypeScript',
          ai_additions: 12,
        },
      ]),
    );

    await expect(api.durations(KEY, '2026-10-24')).resolves.toEqual({
      start: new Date('2026-10-23T17:00:00.000Z'),
      // Giây cuối 16:59:59 → ngày kết thúc lúc 17:00:00, nối liền ngày sau.
      end: new Date('2026-10-24T17:00:00.000Z'),
      sessions: [
        {
          project: 'magnum-opus',
          start: new Date(1_792_818_000_500),
          seconds: 2400.25,
        },
      ],
    });
    expect(urlOf(fetchFn, 0)).toBe(
      'https://wakatime.test/api/v1/users/current/durations?date=2026-10-24',
    );
  });

  it('skips a malformed session instead of failing the day', async () => {
    const { client: api } = client(
      day([
        { project: 'magnum-opus', time: 1_792_818_000, duration: 60 },
        { project: '', time: 1_792_818_100, duration: 60 },
        { project: 'magnum-opus', time: '1792818200', duration: 60 },
        { project: 'magnum-opus', time: 1_792_818_300, duration: 0 },
        { project: 'magnum-opus', time: 1_792_818_400, duration: -5 },
      ]),
    );

    const result = await api.durations(KEY, '2026-10-24');

    expect(result.sessions).toHaveLength(1);
  });

  it.each([
    ['no start', { data: [], end: '2026-10-24T16:59:59Z' }],
    [
      'an end that is not a date',
      { data: [], start: '2026-10-23T17:00:00Z', end: 'soon' },
    ],
  ])(
    'treats a day with %s as unavailable — the ledger must not replace it',
    async (_, body) => {
      const { client: api } = client(json(200, body));

      await expect(api.durations(KEY, '2026-10-24')).rejects.toBeInstanceOf(
        WakaTimeUnavailableException,
      );
    },
  );

  it.each([
    [401, WakaTimeKeyInvalidException],
    [429, WakaTimeRateLimitedException],
    [503, WakaTimeUnavailableException],
  ])('maps HTTP %i like every other call', async (status, exception) => {
    const { client: api } = client(json(status, {}));

    await expect(api.durations(KEY, '2026-10-24')).rejects.toBeInstanceOf(
      exception,
    );
  });
});
