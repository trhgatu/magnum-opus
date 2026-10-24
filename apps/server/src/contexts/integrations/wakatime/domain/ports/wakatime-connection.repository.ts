import type { WakaTimeConnection } from '../wakatime-connection.entity';

export const WAKATIME_CONNECTION_REPOSITORY = Symbol(
  'WAKATIME_CONNECTION_REPOSITORY',
);

export interface WakaTimeConnectionRepository {
  findByOwner(ownerId: string): Promise<WakaTimeConnection | null>;
  /**
   * Tạo kết nối đầu tiên của owner. Trả false nếu owner đã có kết nối —
   * vd một request khác vừa tạo xong — thay vì ghi đè kết nối đó.
   */
  insert(connection: WakaTimeConnection): Promise<boolean>;
  /**
   * Cập nhật kết nối đã có (key, tài khoản, trạng thái), chỉ khi nó vẫn mang
   * `expectedEncryptedKey` — key lúc đọc ra. Trả false nếu kết nối không còn
   * (một disconnect vừa xóa nó) hoặc đã bị thay bởi một request khác, để
   * người gọi đọc lại thay vì ghi đè âm thầm.
   */
  update(
    connection: WakaTimeConnection,
    expectedEncryptedKey: string,
  ): Promise<boolean>;
  /**
   * Đánh dấu REVOKED, chỉ khi kết nối vẫn mang đúng key đã bị WakaTime từ
   * chối — một lần kết nối lại xen giữa đã thay key thì giữ nguyên.
   */
  revokeIfKeyUnchanged(ownerId: string, encryptedKey: string): Promise<void>;
  /** Không có gì để xóa cũng không lỗi. */
  deleteByOwner(ownerId: string): Promise<void>;
}
