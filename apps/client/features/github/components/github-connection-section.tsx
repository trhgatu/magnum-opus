import type { GitHubConnectionResponse } from "@repo/contracts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getGitHubConnection } from "@/features/github/api/github-connection";

import { GitHubConnectionCard } from "./github-connection-card";

/**
 * Đọc kết nối GitHub riêng, trong Suspense: GitHub hay integrations lỗi thì
 * chỉ card này báo lỗi — phần còn lại của Cài đặt (múi giờ) vẫn dùng được.
 */
export async function GitHubConnectionSection({
  timeZone,
}: {
  timeZone: string;
}) {
  let connection: GitHubConnectionResponse | null;
  try {
    connection = await getGitHubConnection();
  } catch {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Kết nối GitHub</h2>
        <Alert variant="destructive">
          <AlertDescription>
            Chưa tải được trạng thái kết nối GitHub. Tải lại trang để thử lại.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <GitHubConnectionCard connection={connection} timeZone={timeZone} />;
}

export function GitHubConnectionSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}
