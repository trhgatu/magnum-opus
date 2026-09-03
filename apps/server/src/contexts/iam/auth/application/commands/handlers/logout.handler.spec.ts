import type { ISessionStore } from '../../ports/session-store.port';
import { LogoutCommand } from '../logout.command';
import { LogoutCommandHandler } from './logout.handler';

describe('LogoutCommandHandler', () => {
  it('revokes the refresh session for the given jti', async () => {
    const sessionStore = {
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISessionStore>;
    const handler = new LogoutCommandHandler(sessionStore);

    const result = await handler.execute(
      new LogoutCommand({ userId: 'user-id', jti: 'jti-1' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(sessionStore.revokeRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'jti-1',
    );
  });
});
