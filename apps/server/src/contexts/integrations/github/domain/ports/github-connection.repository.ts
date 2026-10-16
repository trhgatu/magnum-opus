import type { GitHubConnection } from '../github-connection.entity';

export const GITHUB_CONNECTION_REPOSITORY = Symbol(
  'GITHUB_CONNECTION_REPOSITORY',
);

export interface GitHubConnectionRepository {
  findByOwner(ownerId: string): Promise<GitHubConnection | null>;
  /**
   * Tạo kết nối đầu tiên của owner. Trả false nếu owner đã có kết nối —
   * vd một request khác vừa tạo xong — thay vì ghi đè kết nối đó.
   */
  insert(connection: GitHubConnection): Promise<boolean>;
  /**
   * Cập nhật kết nối đã có (token, tài khoản, trạng thái). Trả false nếu
   * kết nối không còn — vd một disconnect vừa xóa nó.
   */
  update(connection: GitHubConnection): Promise<boolean>;
  /** Không có gì để xóa cũng không lỗi. */
  deleteByOwner(ownerId: string): Promise<void>;
}
