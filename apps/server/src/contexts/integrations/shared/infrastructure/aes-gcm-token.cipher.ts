import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

import type { TokenCipher } from '../application/ports/token-cipher.port';

const VERSION = 'v1';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * AES-256-GCM. Định dạng lưu: "v1.<base64url(iv | authTag | ciphertext)>".
 * Tiền tố phiên bản cho phép đổi thuật toán/khóa sau này mà vẫn đọc được
 * dữ liệu cũ, không cần thêm cột.
 */

export class AesGcmTokenCipher implements TokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('AesGcmTokenCipher requires a non-empty secret');
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const cipherText = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const payload = Buffer.concat([iv, cipher.getAuthTag(), cipherText]);
    return `${VERSION}.${payload.toString('base64url')}`;
  }
  decrypt(encrypted: string): string {
    const separator = encrypted.indexOf('.');
    const version = encrypted.slice(0, separator);
    if (separator < 0 || version !== VERSION) {
      throw new Error(`Unsupported token cipher version: "${version}"`);
    }

    const payload = Buffer.from(encrypted.slice(separator + 1), 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      payload.subarray(0, IV_LENGTH),
    );
    decipher.setAuthTag(payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));

    return Buffer.concat([
      decipher.update(payload.subarray(IV_LENGTH + TAG_LENGTH)),
      decipher.final(),
    ]).toString('utf8');
  }
}
