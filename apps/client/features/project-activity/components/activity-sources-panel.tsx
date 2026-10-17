import type {
  ActivitySourceResponse,
  GitHubConnectionResponse,
} from "@repo/contracts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/features/account/api/current-user";
import { getGitHubConnection } from "@/features/github/api/github-connection";
import { connectionHealth } from "@/features/github/lib/github-connection";
import { getActivitySources } from "@/features/project-activity/api/project-activity";

import {
  ActivitySourcesSection,
  type ConnectionState,
} from "./activity-sources-section";

/**
 * Đọc nguồn và kết nối riêng, trong Suspense: lỗi ở đây chỉ hiện trong mục
 * này — form tên/mô tả của trang chỉnh sửa vẫn dùng được.
 */
export async function ActivitySourcesPanel({
  projectId,
}: {
  projectId: string;
}) {
  let sources: ActivitySourceResponse[];
  let connection: GitHubConnectionResponse | null;
  let timeZone: string;
  try {
    [sources, connection, { timeZone }] = await Promise.all([
      getActivitySources(projectId),
      getGitHubConnection(),
      getCurrentUser(),
    ]);
  } catch {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Nguồn hoạt động</h2>
        <Alert variant="destructive">
          <AlertDescription>
            Chưa tải được nguồn hoạt động. Tải lại trang để thử lại.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ActivitySourcesSection
      projectId={projectId}
      sources={sources}
      connection={connectionState(connection)}
      timeZone={timeZone}
    />
  );
}

function connectionState(
  connection: GitHubConnectionResponse | null,
): ConnectionState {
  if (!connection) return "none";
  const health = connectionHealth(connection, new Date()).kind;
  return health === "expired" || health === "revoked" ? "unusable" : "active";
}

export function ActivitySourcesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-9 w-36" />
    </div>
  );
}
