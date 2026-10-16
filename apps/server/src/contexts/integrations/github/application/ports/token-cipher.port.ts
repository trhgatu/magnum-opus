export const TOKEN_CIPHER = Symbol('TOKEN_CIPHER');

/** Mã hóa thông tin xác thực trước khi lưu. Không có cách nào lấy lại token
 * ngoài decrypt — và chỉ adapter gọi GitHub được phép gọi decrypt. */

export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}
