import { GitHubAccountChangeUnconfirmedException } from './exceptions';
import { GitHubConnection } from './github-connection.entity';

describe('GitHubConnection', () => {
  const now = new Date('2026-10-16T10:00:00.000Z');
  const account = { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' };
  const otherAccount = { id: '555', nodeId: 'U_other', login: 'other-account' };

  const connect = (expiresAt: Date | null = null) =>
    GitHubConnection.connect({
      id: 'connection-id',
      ownerId: 'owner-id',
      account,
      encryptedToken: 'v1.cipher-1',
      expiresAt,
      now,
    });

  // REVOKED chỉ được ghi ở repository (revokeIfTokenUnchanged); entity
  // đọc lại nó qua rehydrate.
  const revoked = (expiresAt: Date | null = null) =>
    GitHubConnection.rehydrate({
      ...connect(expiresAt).toSnapshot(),
      status: 'REVOKED',
    });

  it('starts ACTIVE, verified now, for the account that owns the token', () => {
    const connection = connect(new Date('2027-10-16T00:00:00.000Z'));

    expect(connection.ownerId).toBe('owner-id');
    expect(connection.account).toEqual(account);
    expect(connection.encryptedToken).toBe('v1.cipher-1');
    expect(connection.statusAt(now)).toBe('ACTIVE');
    expect(connection.lastVerifiedAt).toEqual(now);
    expect(connection.createdAt).toEqual(now);
  });

  describe('statusAt', () => {
    it('stays ACTIVE when the token never expires', () => {
      expect(connect(null).statusAt(new Date('2099-01-01'))).toBe('ACTIVE');
    });

    it('becomes EXPIRED once the expiry has passed, without being saved', () => {
      const connection = connect(new Date('2026-10-20T00:00:00.000Z'));

      expect(connection.statusAt(new Date('2026-10-19T23:59:59.000Z'))).toBe(
        'ACTIVE',
      );
      expect(connection.statusAt(new Date('2026-10-20T00:00:00.000Z'))).toBe(
        'EXPIRED',
      );
    });

    it('reports REVOKED after GitHub rejected the token, even before expiry', () => {
      const connection = revoked(new Date('2027-01-01T00:00:00.000Z'));

      expect(connection.statusAt(now)).toBe('REVOKED');
      expect(connection.isUsableAt(now)).toBe(false);
    });

    it('is usable only while ACTIVE', () => {
      expect(connect(null).isUsableAt(now)).toBe(true);
      expect(
        connect(new Date('2026-10-01T00:00:00.000Z')).isUsableAt(now),
      ).toBe(false);
    });
  });

  describe('replaceToken', () => {
    const later = new Date('2026-11-01T00:00:00.000Z');

    it('replaces the token of the same account and becomes ACTIVE again', () => {
      const connection = revoked(new Date('2026-10-01T00:00:00.000Z'));

      const outcome = connection.replaceToken({
        account,
        encryptedToken: 'v1.cipher-2',
        expiresAt: new Date('2027-11-01T00:00:00.000Z'),
        now: later,
        confirmAccountChange: false,
      });

      expect(outcome).toEqual({ accountChanged: false });
      expect(connection.encryptedToken).toBe('v1.cipher-2');
      expect(connection.statusAt(later)).toBe('ACTIVE');
      expect(connection.lastVerifiedAt).toEqual(later);
      expect(connection.createdAt).toEqual(now);
    });

    it('refuses a token of another account unless the change is confirmed', () => {
      const connection = connect();

      expect(() =>
        connection.replaceToken({
          account: otherAccount,
          encryptedToken: 'v1.cipher-2',
          expiresAt: null,
          now: later,
          confirmAccountChange: false,
        }),
      ).toThrow(GitHubAccountChangeUnconfirmedException);

      // Nothing changed.
      expect(connection.account).toEqual(account);
      expect(connection.encryptedToken).toBe('v1.cipher-1');
    });

    it('names both accounts when the change is not confirmed', () => {
      const connection = connect();

      try {
        connection.replaceToken({
          account: otherAccount,
          encryptedToken: 'v1.cipher-2',
          expiresAt: null,
          now: later,
          confirmAccountChange: false,
        });
        throw new Error('expected an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubAccountChangeUnconfirmedException);
        expect((error as GitHubAccountChangeUnconfirmedException).args).toEqual(
          { currentAccount: 'trhgatu', newAccount: 'other-account' },
        );
      }
    });

    it('switches account when the change is confirmed', () => {
      const connection = connect();

      const outcome = connection.replaceToken({
        account: otherAccount,
        encryptedToken: 'v1.cipher-2',
        expiresAt: null,
        now: later,
        confirmAccountChange: true,
      });

      expect(outcome).toEqual({ accountChanged: true });
      expect(connection.account).toEqual(otherAccount);
      expect(connection.encryptedToken).toBe('v1.cipher-2');
    });

    it('keeps the login current when the same account was renamed', () => {
      const connection = connect();

      connection.replaceToken({
        account: { ...account, login: 'trhgatu-renamed' },
        encryptedToken: 'v1.cipher-2',
        expiresAt: null,
        now: later,
        confirmAccountChange: false,
      });

      expect(connection.account.login).toBe('trhgatu-renamed');
    });
  });

  it('never lets a caller change its dates from outside', () => {
    const expiresAt = new Date('2027-10-16T00:00:00.000Z');
    const connection = connect(expiresAt);

    // Sửa Date đã truyền vào, và Date đọc ra, không được ảnh hưởng entity.
    expiresAt.setTime(0);
    connection.expiresAt?.setTime(0);
    connection.toSnapshot().expiresAt?.setTime(0);
    connection.createdAt.setTime(0);

    expect(connection.expiresAt).toEqual(new Date('2027-10-16T00:00:00.000Z'));
    expect(connection.statusAt(now)).toBe('ACTIVE');
    expect(connection.createdAt).toEqual(now);
  });

  it('round-trips through rehydrate', () => {
    const original = connect(new Date('2027-10-16T00:00:00.000Z'));

    const restored = GitHubConnection.rehydrate(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });
});
