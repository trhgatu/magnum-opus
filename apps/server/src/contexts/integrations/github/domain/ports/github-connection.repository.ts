import type { GitHubConnection } from '../github-connection.entity';

export const GITHUB_CONNECTION_REPOSITORY = Symbol(
  'GITHUB_CONNECTION_REPOSITORY',
);

export interface GitHubConnectionRepository {
  findByOwner(ownerId: string): Promise<GitHubConnection | null>;
  /** Tạo mới hoặc cập nhật — mỗi người dùng có tối đa một kết nối GitHub. */
  save(connection: GitHubConnection): Promise<void>;
  /** Không có gì để xóa cũng không lỗi. */
  deleteByOwner(ownerId: string): Promise<void>;
}
