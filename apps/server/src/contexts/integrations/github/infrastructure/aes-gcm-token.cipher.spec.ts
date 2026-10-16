import { AesGcmTokenCipher } from './aes-gcm-token.cipher';

describe('AesGcmTokenCipher', () => {
  const secret = 'a-test-secret-that-is-long-enough-123456';
  const token = 'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz';

  it('decrypts what it encrypted', () => {
    const cipher = new AesGcmTokenCipher(secret);

    expect(cipher.decrypt(cipher.encrypt(token))).toBe(token);
  });

  it('never stores the plaintext and marks the format version', () => {
    const encrypted = new AesGcmTokenCipher(secret).encrypt(token);

    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(encrypted).not.toContain(token);
    expect(encrypted).not.toContain('github_pat_');
  });

  it('uses a fresh IV each time, so the same token encrypts differently', () => {
    const cipher = new AesGcmTokenCipher(secret);

    expect(cipher.encrypt(token)).not.toBe(cipher.encrypt(token));
  });

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const cipher = new AesGcmTokenCipher(secret);
    const encrypted = cipher.encrypt(token);
    const last = encrypted.at(-1) === 'A' ? 'B' : 'A';
    const tampered = encrypted.slice(0, -1) + last;

    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('cannot decrypt with another secret', () => {
    const encrypted = new AesGcmTokenCipher(secret).encrypt(token);
    const other = new AesGcmTokenCipher(
      'another-secret-that-is-long-enough-1234',
    );

    expect(() => other.decrypt(encrypted)).toThrow();
  });

  it('rejects an unknown format version', () => {
    const cipher = new AesGcmTokenCipher(secret);
    const encrypted = cipher.encrypt(token);

    expect(() => cipher.decrypt(`v9.${encrypted.slice(3)}`)).toThrow(
      /Unsupported/,
    );
  });

  it('refuses an empty secret', () => {
    expect(() => new AesGcmTokenCipher('')).toThrow();
  });
});
