import type { ISessionStore } from '../../ports/session-store.port';
import { RevokeSessionCommand } from '../revoke-session.command';
import { RevokeSessionCommandHandler } from './revoke-session.handler';

describe('RevokeSessionCommandHandler', () => {
  it('revokes the given refresh session', async () => {
    const sessionStore = {
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISessionStore>;
    const handler = new RevokeSessionCommandHandler(sessionStore);

    const result = await handler.execute(
      new RevokeSessionCommand({ userId: 'user-id', jti: 'jti-1' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(sessionStore.revokeRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'jti-1',
    );
  });
});
