import type { ActivityProvider } from '@repo/contracts';

export const RESOURCE_USAGE_READER = Symbol('RESOURCE_USAGE_READER');

export interface ProjectRef {
  id: string;
  title: string;
}

/**
 * Project nào đang dùng một tài nguyên bên ngoài (repository, WakaTime
 * project) làm nguồn — để ô chọn cảnh báo trước khi gắn (07 §4.4). Chỉ đọc;
 * integrations không gọi lên tầng trên.
 */
export interface ResourceUsageReader {
  /**
   * Theo id tài nguyên; tài nguyên không ai dùng thì không có trong kết quả.
   * Mỗi Project xuất hiện tối đa một lần cho một tài nguyên, kể cả khi nó
   * gắn feed của tài nguyên đó dưới nhiều tài khoản.
   */
  usedByProjects(
    ownerId: string,
    provider: ActivityProvider,
    resourceIds: readonly string[],
  ): Promise<Record<string, ProjectRef[]>>;
}
