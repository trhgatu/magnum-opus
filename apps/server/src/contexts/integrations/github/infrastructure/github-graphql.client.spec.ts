import {
  GitHubRateLimitedException,
  GitHubRepositoryNotAccessibleException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../domain/exceptions';
import { GitHubGraphqlClient } from './github-graphql.client';

const BASE = 'https://api.github.test';
const TOKEN = 'fake-secret-token-never-logged';
const NOW = new Date('2026-10-16T10:00:00.000Z');
const SINCE = new Date('2026-10-01T00:00:00.000Z');
const UNTIL = new Date('2026-10-16T00:00:00.000Z');

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const setup = (...responses: Response[]) => {
  const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  for (const response of responses) fetchFn.mockResolvedValueOnce(response);
  const client = new GitHubGraphqlClient({
    fetchFn: fetchFn as unknown as typeof fetch,
    baseUrl: BASE,
    now: () => NOW,
  });
  /** Biến GraphQL của request thứ `index`. */
  const variables = (index: number) =>
    JSON.parse(fetchFn.mock.calls[index][1]?.body as string).variables;
  return { client, fetchFn, variables };
};

const page = (hasNextPage = false, endCursor: string | null = null) => ({
  hasNextPage,
  endCursor,
});

/** Một commit đúng như GraphQL trả về. */
const commitNode = (
  oid: string,
  overrides: Partial<{
    authoredDate: string;
    message: string;
    parents: number;
    databaseId: number | null;
  }> = {},
) => ({
  oid,
  authoredDate: overrides.authoredDate ?? '2026-10-05T11:38:41+07:00',
  message: overrides.message ?? `commit ${oid}`,
  parents: { totalCount: overrides.parents ?? 1 },
  author: {
    user:
      overrides.databaseId === null
        ? null
        : { databaseId: overrides.databaseId ?? 127409189 },
  },
});

const branch = (name: string, commits: unknown[], history = page()) => ({
  name,
  target: { history: { pageInfo: history, nodes: commits } },
});

const refsResponse = (branches: unknown[], refs = page()) =>
  json(200, {
    data: { node: { refs: { pageInfo: refs, nodes: branches } } },
  });

const historyResponse = (commits: unknown[], history = page()) =>
  json(200, {
    data: {
      node: {
        ref: { target: { history: { pageInfo: history, nodes: commits } } },
      },
    },
  });

const commitsInput = {
  repositoryNodeId: 'R_kgDOPeQ8cA',
  authorNodeId: 'U_kgDOB5gcJQ',
  since: SINCE,
  until: UNTIL,
};

describe('GitHubGraphqlClient.listCommits', () => {
  it('reads every branch and keeps a commit shared by branches once', async () => {
    const { client, fetchFn, variables } = setup(
      refsResponse([
        branch('main', [commitNode('a1'), commitNode('b2')]),
        branch('feature/activity', [commitNode('c3'), commitNode('a1')]),
      ]),
    );

    const commits = await client.listCommits(TOKEN, commitsInput);

    expect(commits.map((commit) => commit.oid)).toEqual(['a1', 'b2', 'c3']);
    expect(commits[0]).toEqual({
      oid: 'a1',
      authoredAt: new Date('2026-10-05T04:38:41.000Z'),
      message: 'commit a1',
      parentCount: 1,
      authorAccountId: '127409189',
    });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/graphql`);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(variables(0)).toEqual({
      repositoryId: 'R_kgDOPeQ8cA',
      authorId: 'U_kgDOB5gcJQ',
      since: '2026-10-01T00:00:00.000Z',
      until: '2026-10-16T00:00:00.000Z',
      refCursor: null,
    });
  });

  it('keeps commits GitHub could not link to an account, for the caller to drop', async () => {
    const { client } = setup(
      refsResponse([branch('main', [commitNode('a1', { databaseId: null })])]),
    );

    const [commit] = await client.listCommits(TOKEN, commitsInput);

    expect(commit.authorAccountId).toBeNull();
  });

  it('follows the next page of branches', async () => {
    const { client, variables } = setup(
      refsResponse([branch('main', [commitNode('a1')])], page(true, 'REF1')),
      refsResponse([branch('old', [commitNode('b2')])]),
    );

    const commits = await client.listCommits(TOKEN, commitsInput);

    expect(commits.map((commit) => commit.oid)).toEqual(['a1', 'b2']);
    expect(variables(1).refCursor).toBe('REF1');
  });

  it('follows a long branch history page by page', async () => {
    const { client, variables } = setup(
      refsResponse([branch('main', [commitNode('a1')], page(true, 'HIST1'))]),
      historyResponse([commitNode('b2')], page(true, 'HIST2')),
      historyResponse([commitNode('c3')]),
    );

    const commits = await client.listCommits(TOKEN, commitsInput);

    expect(commits.map((commit) => commit.oid)).toEqual(['a1', 'b2', 'c3']);
    expect(variables(1)).toEqual({
      repositoryId: 'R_kgDOPeQ8cA',
      qualifiedName: 'refs/heads/main',
      authorId: 'U_kgDOB5gcJQ',
      since: '2026-10-01T00:00:00.000Z',
      until: '2026-10-16T00:00:00.000Z',
      historyCursor: 'HIST1',
    });
    expect(variables(2).historyCursor).toBe('HIST2');
  });

  it('gives up on a history that never ends instead of looping forever', async () => {
    const fetchFn = jest.fn(async (_url: unknown, init?: RequestInit) => {
      const isRefs = (init?.body as string).includes('refCursor');
      return isRefs
        ? refsResponse([branch('main', [], page(true, 'H'))])
        : historyResponse([], page(true, 'H'));
    });
    const client = new GitHubGraphqlClient({
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: BASE,
      now: () => NOW,
    });

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(GitHubUnavailableException);
    expect(fetchFn).toHaveBeenCalledTimes(100);
  });

  it('reports a branch deleted between two history pages instead of returning less', async () => {
    const { client } = setup(
      refsResponse([branch('main', [commitNode('a1')], page(true, 'HIST1'))]),
      json(200, { data: { node: { ref: null } } }),
    );

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(GitHubUnavailableException);
  });

  it('reports a repository the token cannot see as not accessible', async () => {
    const { client } = setup(json(200, { data: { node: null } }));

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotAccessibleException);
  });

  it('reports a NOT_FOUND error as not accessible', async () => {
    const { client } = setup(
      json(200, {
        data: { node: null },
        errors: [{ type: 'NOT_FOUND', message: 'Could not resolve' }],
      }),
    );

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotAccessibleException);
  });

  it('reports a GraphQL RATE_LIMITED error with the seconds until reset', async () => {
    const reset = String(NOW.getTime() / 1000 + 120);
    const { client } = setup(
      json(
        200,
        {
          errors: [
            { type: 'RATE_LIMITED', message: 'API rate limit exceeded' },
          ],
        },
        { 'x-ratelimit-reset': reset },
      ),
    );

    const error = await client
      .listCommits(TOKEN, commitsInput)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubRateLimitedException);
    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 120,
    });
  });

  it('waits the default time when the reset is already in the past', async () => {
    const reset = String(NOW.getTime() / 1000 - 5);
    const { client } = setup(
      json(
        200,
        {
          errors: [
            { type: 'RATE_LIMITED', message: 'API rate limit exceeded' },
          ],
        },
        { 'x-ratelimit-reset': reset },
      ),
    );

    const error = await client
      .listCommits(TOKEN, commitsInput)
      .catch((e: unknown) => e);

    expect((error as GitHubRateLimitedException).args).toEqual({
      retryAfter: 60,
    });
  });

  it('reports any other GraphQL error as GitHub being unavailable', async () => {
    const { client } = setup(
      json(200, { errors: [{ type: 'INTERNAL', message: 'Something broke' }] }),
    );

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(GitHubUnavailableException);
  });

  it.each([
    [
      'a token GitHub no longer accepts',
      json(401, {}),
      GitHubTokenInvalidException,
    ],
    [
      'a secondary rate limit',
      json(403, { message: 'You have exceeded a secondary rate limit' }),
      GitHubRateLimitedException,
    ],
    ['a server error', json(502, {}), GitHubUnavailableException],
    [
      'malformed JSON',
      new Response('{not json', { status: 200 }),
      GitHubUnavailableException,
    ],
    [
      'a commit of the wrong shape',
      refsResponse([branch('main', [{ oid: 'a1' }])]),
      GitHubUnavailableException,
    ],
  ])('maps %s to its own error', async (_label, response, expected) => {
    const { client } = setup(response);

    await expect(
      client.listCommits(TOKEN, commitsInput),
    ).rejects.toBeInstanceOf(expected);
  });
});

const prNode = (
  number: number,
  updatedAt: string,
  overrides: Partial<{
    createdAt: string;
    mergedAt: string | null;
    author: unknown;
  }> = {},
) => ({
  number,
  createdAt: overrides.createdAt ?? updatedAt,
  mergedAt: overrides.mergedAt ?? null,
  updatedAt,
  author: 'author' in overrides ? overrides.author : { databaseId: 127409189 },
});

const prsResponse = (nodes: unknown[], prs = page()) =>
  json(200, {
    data: { node: { pullRequests: { pageInfo: prs, nodes } } },
  });

const prsInput = { repositoryNodeId: 'R_kgDOPeQ8cA', updatedSince: SINCE };

describe('GitHubGraphqlClient.listPullRequests', () => {
  it('maps pull requests updated since the given time, any state', async () => {
    const { client, variables } = setup(
      prsResponse([
        prNode(162, '2026-10-16T09:00:00Z', {
          createdAt: '2026-10-15T08:00:00Z',
          mergedAt: '2026-10-16T09:00:00Z',
        }),
        // Bot (Dependabot): author không phải User → không có databaseId.
        prNode(160, '2026-10-10T00:00:00Z', { author: {} }),
        prNode(150, '2026-10-05T00:00:00Z', { author: null }),
      ]),
    );

    const prs = await client.listPullRequests(TOKEN, prsInput);

    expect(prs).toEqual([
      {
        number: 162,
        createdAt: new Date('2026-10-15T08:00:00.000Z'),
        mergedAt: new Date('2026-10-16T09:00:00.000Z'),
        updatedAt: new Date('2026-10-16T09:00:00.000Z'),
        authorAccountId: '127409189',
      },
      expect.objectContaining({ number: 160, authorAccountId: null }),
      expect.objectContaining({ number: 150, authorAccountId: null }),
    ]);
    expect(variables(0)).toEqual({
      repositoryId: 'R_kgDOPeQ8cA',
      cursor: null,
    });
  });

  it('stops paging at the first pull request older than the given time', async () => {
    const { client, fetchFn } = setup(
      prsResponse(
        [
          prNode(162, '2026-10-16T09:00:00Z'),
          prNode(140, '2026-09-20T00:00:00Z'),
          prNode(130, '2026-09-10T00:00:00Z'),
        ],
        page(true, 'PR1'),
      ),
    );

    const prs = await client.listPullRequests(TOKEN, prsInput);

    expect(prs.map((pr) => pr.number)).toEqual([162]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('follows the next page while every pull request is recent', async () => {
    const { client, variables } = setup(
      prsResponse([prNode(162, '2026-10-16T09:00:00Z')], page(true, 'PR1')),
      prsResponse([prNode(161, '2026-10-15T00:00:00Z')]),
    );

    const prs = await client.listPullRequests(TOKEN, prsInput);

    expect(prs.map((pr) => pr.number)).toEqual([162, 161]);
    expect(variables(1).cursor).toBe('PR1');
  });

  it('reports a repository the token cannot see as not accessible', async () => {
    const { client } = setup(json(200, { data: { node: null } }));

    await expect(
      client.listPullRequests(TOKEN, prsInput),
    ).rejects.toBeInstanceOf(GitHubRepositoryNotAccessibleException);
  });

  it('reports a pull request of the wrong shape as GitHub being unavailable', async () => {
    const { client } = setup(prsResponse([{ number: '162' }]));

    await expect(
      client.listPullRequests(TOKEN, prsInput),
    ).rejects.toBeInstanceOf(GitHubUnavailableException);
  });
});
