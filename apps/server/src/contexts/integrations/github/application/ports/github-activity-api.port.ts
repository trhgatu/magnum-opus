export const GITHUB_ACTIVITY_API = Symbol('GITHUB_ACTIVITY_API');

export interface GitHubCommit {
  oid: string;
  authoredAt: Date;
  message: string;
  /** Từ 2 trở lên là merge commit. */

  parentCount: number;
  /** databaseId của tác giả; null khi GitHub không liên kết được email với tài khoản. */
  authorAccountId: string | null;
}

export interface GitHubPullRequest {
  number: number;
  createdAt: Date;
  mergedAt: Date | null;
  updatedAt: Date;
  /** databaseId của người mở; null với bot hoặc tài khoản đã xóa. */
  authorAccountId: string | null;
}

export interface GitHubActivityApi {
  /**
   * Commit của tác giả trên mọi nhánh, committer date trong khoảng
   * [since, until] (bộ lọc của GitHub), mỗi oid một lần.
   */
  listCommits(
    token: string,
    input: {
      repositoryNodeId: string;
      authorNodeId: string;
      since: Date;
      until: Date;
    },
  ): Promise<GitHubCommit[]>;

  /** Pull request mọi trạng thái, cập nhật từ updatedSince trở đi. */
  listPullRequests(
    token: string,
    input: { repositoryNodeId: string; updatedSince: Date },
  ): Promise<GitHubPullRequest[]>;
}
