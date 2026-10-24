import { AesGcmTokenCipher } from './aes-gcm-token.cipher';

describe('AesGcmTokenCipher', () => {
  const secret = 'a-test-secret-that-is-long-enough-123456';
  const token = 'fake-token-for-cipher-tests-not-a-real-credential';

  it('decrypts what it encrypted', () => {
    const cipher = new AesGcmTokenCipher(secret);

    expect(cipher.decrypt(cipher.encrypt(token))).toBe(token);
  });

  it('never stores the plaintext and marks the format version', () => {
    const encrypted = new AesGcmTokenCipher(secret).encrypt(token);

    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(encrypted).not.toContain(token);
    expect(encrypted).not.toContain('fake-token');
  });

  it('uses a fresh IV each time, so the same token encrypts differently', () => {
    const cipher = new AesGcmTokenCipher(secret);

    expect(cipher.encrypt(token)).not.toBe(cipher.encrypt(token));
  });

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const cipher = new AesGcmTokenCipher(secret);
    const encrypted = cipher.encrypt(token);
    // Đổi một ký tự ở đầu payload (ngay sau "v1."): luôn đổi bit thật của IV,
    // không rơi vào các bit đệm cuối chuỗi base64url.
    const index = 4;
    const swapped = encrypted[index] === 'A' ? 'B' : 'A';
    const tampered =
      encrypted.slice(0, index) + swapped + encrypted.slice(index + 1);

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
