import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hashes a password and verifies it against the same plaintext', async () => {
    const hash = await hasher.hash('a-strong-password');

    expect(hash).not.toBe('a-strong-password');
    await expect(hasher.compare('a-strong-password', hash)).resolves.toBe(true);
  });

  it('rejects the wrong plaintext against a hash', async () => {
    const hash = await hasher.hash('a-strong-password');

    await expect(hasher.compare('the-wrong-password', hash)).resolves.toBe(
      false,
    );
  });

  it('salts each hash differently even for the same password', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('a-strong-password'),
      hasher.hash('a-strong-password'),
    ]);

    expect(first).not.toBe(second);
  });
});
