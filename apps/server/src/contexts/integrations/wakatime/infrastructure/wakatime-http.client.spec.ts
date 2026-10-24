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
