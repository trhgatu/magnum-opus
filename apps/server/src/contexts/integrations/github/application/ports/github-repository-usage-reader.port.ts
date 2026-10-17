export const GITHUB_REPOSITORY_USAGE_READER = Symbol(
  'GITHUB_REPOSITORY_USAGE_READER',
);

export interface ProjectRef {
  id: string;
  title: string;
}

/**
 * Project nào đang dùng repository làm nguồn — để ô chọn repository cảnh báo
 * trước khi gắn (07 §4.4). Chỉ đọc; integrations không gọi lên tầng trên.
 */
export interface GitHubRepositoryUsageReader {
  /**
   * Theo id repository; repository không ai dùng thì không có trong kết quả.
   * Mỗi Project xuất hiện tối đa một lần cho một repository, kể cả khi nó
   * gắn feed của repository đó dưới nhiều tài khoản.
   */
  usedByProjects(
    ownerId: string,
    repositoryIds: readonly string[],
  ): Promise<Record<string, ProjectRef[]>>;
}
