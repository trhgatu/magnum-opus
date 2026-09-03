import type {
  ISessionStore,
  SessionData,
} from '../../ports/session-store.port';
import { GetActiveSessionsQuery } from '../get-active-sessions.query';
import { GetActiveSessionsQueryHandler } from './get-active-sessions.handler';

describe('GetActiveSessionsQueryHandler', () => {
  const session = (jti: string, createdAt: string): SessionData => ({
    jti,
    sessionId: jti,
    ip: '127.0.0.1',
    userAgent: 'Mozilla',
    createdAt,
  });

  const createSessionStore = (sessions: SessionData[]) =>
    ({
      getUserSessions: jest.fn().mockResolvedValue(sessions),
    }) as unknown as jest.Mocked<ISessionStore>;

  it('sorts sessions newest first and flags the current one', async () => {
    const sessions = [
      session('older', '2026-08-20T10:00:00.000Z'),
      session('newer', '2026-08-21T10:00:00.000Z'),
    ];
    const sessionStore = createSessionStore(sessions);
    const handler = new GetActiveSessionsQueryHandler(sessionStore);

    const result = await handler.execute(
      new GetActiveSessionsQuery('user-id', 1, 10, 'newer'),
    );

    expect(result.isSuccess).toBe(true);
    const { sessions: ordered, total } = result.getValue();
    expect(total).toBe(2);
    expect(ordered.map((s) => s.jti)).toEqual(['newer', 'older']);
    expect(ordered[0]).toMatchObject({ isCurrent: true });
    expect(ordered[1]).toMatchObject({ isCurrent: false });
  });

  it('paginates the sorted sessions', async () => {
    const sessions = [
      session('s1', '2026-08-18T10:00:00.000Z'),
      session('s2', '2026-08-19T10:00:00.000Z'),
      session('s3', '2026-08-20T10:00:00.000Z'),
    ];
    const sessionStore = createSessionStore(sessions);
    const handler = new GetActiveSessionsQueryHandler(sessionStore);

    const result = await handler.execute(
      new GetActiveSessionsQuery('user-id', 2, 1),
    );

    const { sessions: page, total } = result.getValue();
    expect(total).toBe(3);
    expect(page.map((s) => s.jti)).toEqual(['s2']);
  });
});
