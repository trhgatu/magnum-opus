import { GitHubConnection } from '../../domain/github-connection.entity';
import { GitHubConnectionPresenter } from './github-connection.presenter';

describe('GitHubConnectionPresenter', () => {
  const connection = (expiresAt: Date | null) =>
    GitHubConnection.connect({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' },
      encryptedToken: 'v1.secret-ciphertext',
      expiresAt,
      now: new Date('2026-09-01T00:00:00.000Z'),
    });

  it('presents the account, status and dates — never the token', () => {
    const response = GitHubConnectionPresenter.toResponse(
      connection(new Date('2027-10-14T00:00:00.000Z')),
      new Date('2026-10-16T10:00:00.000Z'),
    );

    expect(response).toEqual({
      accountLogin: 'trhgatu',
      status: 'ACTIVE',
      expiresAt: '2027-10-14T00:00:00.000Z',
      lastVerifiedAt: '2026-09-01T00:00:00.000Z',
      connectedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(JSON.stringify(response)).not.toContain('secret-ciphertext');
  });

  it('reports EXPIRED once the expiry has passed at presentation time', () => {
    const response = GitHubConnectionPresenter.toResponse(
      connection(new Date('2026-10-01T00:00:00.000Z')),
      new Date('2026-10-16T10:00:00.000Z'),
    );

    expect(response.status).toBe('EXPIRED');
  });

  it('presents a token without expiry as null', () => {
    const response = GitHubConnectionPresenter.toResponse(
      connection(null),
      new Date('2026-10-16T10:00:00.000Z'),
    );

    expect(response.expiresAt).toBeNull();
  });
});
