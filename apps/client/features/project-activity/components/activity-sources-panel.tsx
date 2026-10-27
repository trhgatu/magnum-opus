import type {
  ActivitySourceResponse,
  GitHubConnectionResponse,
  WakaTimeConnectionResponse,
} from "@repo/contracts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/features/account/api/current-user";
import { getGitHubConnection } from "@/features/github/api/github-connection";
import { getActivitySources } from "@/features/project-activity/api/project-activity";
import { getWakaTimeConnection } from "@/features/wakatime/api/wakatime-connection";

import { ActivitySourcesSection } from "./activity-sources-section";

/**
 * Đọc nguồn trong Suspense riêng: lỗi ở đây chỉ hiện trong sheet nguồn — phần
 * còn lại của trang chi tiết vẫn dùng được. Kết nối GitHub và WakaTime đọc
 * riêng nữa: chúng lỗi thì vẫn hiện được các nguồn đã gắn và nút gỡ.
 */
export async function ActivitySourcesPanel({
  projectId,
}: {
  projectId: string;
}) {
  // Chạy song song với nguồn, nhưng lỗi của nó chỉ thành "unavailable".
  const connectionRead: Promise<
    GitHubConnectionResponse | null | "unavailable"
  > = getGitHubConnection().catch(() => "unavailable" as const);

  const wakaTimeRead: Promise<
    WakaTimeConnectionResponse | null | "unavailable"
  > = getWakaTimeConnection().catch(() => "unavailable" as const);
  let sources: ActivitySourceResponse[];
  let timeZone: string;
  try {
    [sources, { timeZone }] = await Promise.all([
      getActivitySources(projectId),
      getCurrentUser(),
    ]);
  } catch {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Chưa tải được nguồn hoạt động. Tải lại trang để thử lại.
        </AlertDescription>
      </Alert>
    );
  }

  const [connection, wakaTimeConnection] = await Promise.all([
    connectionRead,
    wakaTimeRead,
  ]);

  return (
    <ActivitySourcesSection
      projectId={projectId}
      sources={sources}
      connection={connection}
      wakaTimeConnection={wakaTimeConnection}
      timeZone={timeZone}
    />
  );
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
