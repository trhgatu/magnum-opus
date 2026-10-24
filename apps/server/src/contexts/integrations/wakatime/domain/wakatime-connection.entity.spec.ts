import { WakaTimeAccountChangeUnconfirmedException } from './exceptions';
import { WakaTimeConnection } from './wakatime-connection.entity';

const NOW = new Date('2026-10-24T10:00:00.000Z');

const connect = () =>
  WakaTimeConnection.connect({
    id: 'connection-id',
    ownerId: 'owner-id',
    account: { id: 'user-uuid', username: 'trhgatu' },
    encryptedKey: 'enc(first)',
    now: NOW,
  });

describe('WakaTimeConnection', () => {
  it('starts active, verified and created now', () => {
    const connection = connect();

    expect(connection.isUsable()).toBe(true);
    expect(connection.lastVerifiedAt).toEqual(NOW);
    expect(connection.createdAt).toEqual(NOW);
  });

  it('cannot be changed through the dates and account it hands out', () => {
    const connection = connect();
    connection.lastVerifiedAt.setFullYear(2000);
    connection.account.username = 'changed';

    expect(connection.lastVerifiedAt).toEqual(NOW);
    expect(connection.account.username).toBe('trhgatu');
  });

  it('becomes usable again when a revoked key is replaced', () => {
    const connection = WakaTimeConnection.rehydrate({
      ...connect().toSnapshot(),
      status: 'REVOKED',
    });
    expect(connection.isUsable()).toBe(false);

    const later = new Date('2026-10-25T00:00:00.000Z');
    const { accountChanged } = connection.replaceKey({
      account: { id: 'user-uuid', username: 'trhgatu' },
      encryptedKey: 'enc(second)',
      now: later,
      confirmAccountChange: false,
    });

    expect(accountChanged).toBe(false);
    expect(connection.isUsable()).toBe(true);
    expect(connection.encryptedKey).toBe('enc(second)');
    expect(connection.lastVerifiedAt).toEqual(later);
  });

  it('refuses another account unless the change is confirmed', () => {
    const connection = connect();
    const replace = (confirmAccountChange: boolean) =>
      connection.replaceKey({
        account: { id: 'other-uuid', username: 'other' },
        encryptedKey: 'enc(other)',
        now: NOW,
        confirmAccountChange,
      });

    expect(() => replace(false)).toThrow(
      WakaTimeAccountChangeUnconfirmedException,
    );
    expect(connection.encryptedKey).toBe('enc(first)');
    expect(replace(true)).toEqual({ accountChanged: true });
    expect(connection.account).toEqual({ id: 'other-uuid', username: 'other' });
  });
});
