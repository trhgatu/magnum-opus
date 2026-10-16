export const TOKEN_CIPHER = Symbol('TOKEN_CIPHER');

/** Mã hóa thông tin xác thực trước khi lưu. Provider này chỉ tồn tại bên
 * trong GitHubModule (không export): ngoài module, không gì giải mã được
 * token. Bên trong module, chỉ adapter gọi GitHub được phép gọi decrypt. */

export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(encrypted: string): string;
}
