import {
  GitHubRateLimitedException,
  GitHubTokenInsufficientScopeException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../domain/exceptions';
import { GitHubRestClient } from './github-rest.client';

const TOKEN = 'fake-secret-token-never-logged';
const NOW = new Date('2026-10-16T10:00:00.000Z');

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const user = { id: 127409189, node_id: 'U_kgDOB5gcJQ', login: 'trhgatu' };

describe('GitHubRestClient.verifyToken', () => {
  const setup = (...responses: Array<Response | Error>) => {
    const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    for (const response of responses) {
      if (response instanceof Error) fetchFn.mockRejectedValueOnce(response);
      else fetchFn.mockResolvedValueOnce(response);
    }
    const client = new GitHubRestClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://api.github.test',
      now: () => NOW,
    });
    return { client, fetchFn };
  };

  it('returns the account that owns the token and its expiry', async () => {
    const { client, fetchFn } = setup(
      json(200, user, {
        'github-authentication-token-expiration': '2027-10-14 00:00:00 UTC',
      }),
      json(200, []),
    );

    await expect(client.verifyToken(TOKEN)).resolves.toEqual({
      account: { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' },
      expiresAt: new Date('2027-10-14T00:00:00.000Z'),
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.github.test/user');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(headers.get('accept')).toBe('application/vnd.github+json');
    expect(headers.get('x-github-api-version')).toBe('2022-11-28');
    expect(headers.get('user-agent')).toBeTruthy();
    expect(fetchFn.mock.calls[1][0]).toBe(
      'https://api.github.test/user/repos?per_page=1',
    );
  });

  it('reads an expiry header with a numeric UTC offset', async () => {
    const { client } = setup(
      json(200, user, {
        'github-authentication-token-expiration': '2027-10-14 07:00:00 +0700',
      }),
      json(200, []),
    );

    await expect(client.verifyToken(TOKEN)).resolves.toMatchObject({
      expiresAt: new Date('2027-10-14T00:00:00.000Z'),
    });
  });

  it('reports no expiry when GitHub sends none', async () => {
    const { client } = setup(json(200, user), json(200, []));

    await expect(client.verifyToken(TOKEN)).resolves.toMatchObject({
      expiresAt: null,
    });
  });

  it('ignores an expiry header it cannot parse rather than failing', async () => {
    const { client } = setup(
      json(200, user, { 'github-authentication-token-expiration': 'soon' }),
      json(200, []),
    );

    await expect(client.verifyToken(TOKEN)).resolves.toMatchObject({
      expiresAt: null,
    });
  });

  it('rejects a token GitHub does not accept', async () => {
    const { client, fetchFn } = setup(
      json(401, { message: 'Bad credentials' }),
    );

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubTokenInvalidException,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects a token that cannot read repositories', async () => {
    const { client } = setup(
      json(200, user),
      json(403, {
        message: 'Resource not accessible by personal access token',
      }),
    );

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubTokenInsufficientScopeException,
    );
  });

  it('reports each failure with its own stable error code', async () => {
    const cases: Array<[Array<Response | Error>, string]> = [
      [[json(401, {})], 'GITHUB_TOKEN_INVALID'],
      [[json(200, user), json(403, {})], 'GITHUB_TOKEN_INSUFFICIENT_SCOPE'],
      [[json(429, {}, { 'retry-after': '5' })], 'GITHUB_RATE_LIMITED'],
      [[json(503, {})], 'GITHUB_UNAVAILABLE'],
    ];

    for (const [responses, code] of cases) {
      const { client } = setup(...responses);
      const error = (await client
        .verifyToken(TOKEN)
        .catch((e: unknown) => e)) as { error: { code: string } };

      expect(error.error.code).toBe(code);
    }
  });

  it('recognises a secondary rate limit that carries no rate-limit headers', async () => {
    const { client } = setup(
      json(200, user),
      json(403, {
        message: 'You have exceeded a secondary rate limit. Please wait.',
      }),
    );

    const error = await client.verifyToken(TOKEN).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitedException);
    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 60,
    });
  });

  it('reports a primary rate limit with the seconds until reset', async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 120;
    const { client } = setup(
      json(
        403,
        { message: 'API rate limit exceeded' },
        { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) },
      ),
    );

    const error = await client.verifyToken(TOKEN).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitedException);
    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 120,
    });
  });

  it('reports a secondary rate limit from retry-after', async () => {
    const { client } = setup(
      json(429, { message: 'secondary rate limit' }, { 'retry-after': '30' }),
    );

    const error = await client.verifyToken(TOKEN).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitedException);
    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 30,
    });
  });

  it('treats a rate limit on the scope check as a rate limit, not missing scope', async () => {
    const { client } = setup(
      json(200, user),
      json(403, {}, { 'x-ratelimit-remaining': '0', 'retry-after': '10' }),
    );

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubRateLimitedException,
    );
  });

  it.each([500, 502, 503])(
    'reports GitHub as unavailable on %s',
    async (status) => {
      const { client } = setup(json(status, { message: 'oops' }));

      await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
        GitHubUnavailableException,
      );
    },
  );

  it('reports GitHub as unavailable when the network fails', async () => {
    const { client } = setup(new TypeError('fetch failed'));

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubUnavailableException,
    );
  });

  it('reports GitHub as unavailable when the request times out', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    const { client } = setup(timeout);

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubUnavailableException,
    );
  });

  it('aborts a request that hangs past the timeout', async () => {
    // fetch giả chỉ kết thúc khi signal bị hủy — như một request bị treo.
    const fetchFn = jest.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const timeout = new Error('The operation was aborted');
            timeout.name = 'TimeoutError';
            reject(timeout);
          });
        }),
    );
    const client = new GitHubRestClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: 'https://api.github.test',
      now: () => NOW,
      timeoutMs: 20,
    });

    await expect(client.verifyToken(TOKEN)).rejects.toBeInstanceOf(
      GitHubUnavailableException,
    );
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('never puts the token into an error message', async () => {
    for (const response of [
      json(401, {}),
      json(500, {}),
      new TypeError(`fetch failed for ${TOKEN}`),
    ]) {
      const { client } = setup(response);
      const error = (await client
        .verifyToken(TOKEN)
        .catch((e: unknown) => e)) as Error;

      expect(error.message).not.toContain(TOKEN);
      expect(
        JSON.stringify((error as { args?: unknown }).args ?? {}),
      ).not.toContain(TOKEN);
    }
  });
});

describe('GitHubRestClient.listRepositories', () => {
  const BASE = 'https://api.github.test';

  const setup = (...responses: Array<Response | Error>) => {
    const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    for (const response of responses) {
      if (response instanceof Error) fetchFn.mockRejectedValueOnce(response);
      else fetchFn.mockResolvedValueOnce(response);
    }
    const client = new GitHubRestClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: BASE,
      now: () => NOW,
    });
    return { client, fetchFn };
  };

  const repo = (id: number, pushedAt: string | null = null) => ({
    id,
    full_name: `trhgatu/repo-${id}`,
    private: id % 2 === 0,
    pushed_at: pushedAt,
  });

  const nextLink = (page: number) => ({
    link: `<${BASE}/user/repos?per_page=100&sort=pushed&page=${page}>; rel="next", <${BASE}/user/repos?per_page=100&sort=pushed&page=99>; rel="last"`,
  });

  it('reads every page GitHub reports and maps each repository', async () => {
    const { client, fetchFn } = setup(
      json(200, [repo(1, '2026-10-15T08:00:00Z')], nextLink(2)),
      json(200, [repo(2)]),
    );

    await expect(client.listRepositories(TOKEN)).resolves.toEqual({
      repositories: [
        {
          id: '1',
          fullName: 'trhgatu/repo-1',
          isPrivate: false,
          pushedAt: new Date('2026-10-15T08:00:00.000Z'),
        },
        {
          id: '2',
          fullName: 'trhgatu/repo-2',
          isPrivate: true,
          pushedAt: null,
        },
      ],
      complete: true,
    });

    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
      `${BASE}/user/repos?per_page=100&sort=pushed`,
      `${BASE}/user/repos?per_page=100&sort=pushed&page=2`,
    ]);
    for (const [, init] of fetchFn.mock.calls) {
      expect(new Headers(init?.headers).get('authorization')).toBe(
        `Bearer ${TOKEN}`,
      );
    }
  });

  it('stops after the page limit and says the list is incomplete', async () => {
    const pages = Array.from({ length: 10 }, (_, i) =>
      json(200, [repo(i + 1)], nextLink(i + 2)),
    );
    const { client, fetchFn } = setup(...pages);

    const result = await client.listRepositories(TOKEN);

    expect(fetchFn).toHaveBeenCalledTimes(10);
    expect(result.repositories).toHaveLength(10);
    expect(result.complete).toBe(false);
  });

  it('never sends the token to a next link on another host', async () => {
    const { client, fetchFn } = setup(
      json(200, [repo(1)], {
        link: '<https://evil.test/user/repos?page=2>; rel="next"',
      }),
    );

    await expect(client.listRepositories(TOKEN)).rejects.toBeInstanceOf(
      GitHubUnavailableException,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects a token GitHub no longer accepts', async () => {
    const { client } = setup(json(401, { message: 'Bad credentials' }));

    await expect(client.listRepositories(TOKEN)).rejects.toBeInstanceOf(
      GitHubTokenInvalidException,
    );
  });

  it('reports a rate limit on any page as a rate limit', async () => {
    const { client } = setup(
      json(200, [repo(1)], nextLink(2)),
      json(403, {}, { 'x-ratelimit-remaining': '0', 'retry-after': '30' }),
    );

    const error = await client.listRepositories(TOKEN).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitedException);
    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 30,
    });
  });

  it('reports GitHub as unavailable on a server error', async () => {
    const { client } = setup(json(502, {}));

    await expect(client.listRepositories(TOKEN)).rejects.toBeInstanceOf(
      GitHubUnavailableException,
    );
  });
});
