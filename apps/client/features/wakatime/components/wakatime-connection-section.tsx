import type { WakaTimeConnectionResponse } from "@repo/contracts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getWakaTimeConnection } from "@/features/wakatime/api/wakatime-connection";

import { WakaTimeConnectionCard } from "./wakatime-connection-card";

/**
 * Đọc kết nối WakaTime riêng, trong Suspense: WakaTime lỗi thì chỉ card này
 * báo lỗi — phần còn lại của Cài đặt vẫn dùng được.
 */
export async function WakaTimeConnectionSection({
  timeZone,
}: {
  timeZone: string;
}) {
  let connection: WakaTimeConnectionResponse | null;
  try {
    connection = await getWakaTimeConnection();
  } catch {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Kết nối WakaTime</h2>
        <Alert variant="destructive">
          <AlertDescription>
            Chưa tải được trạng thái kết nối WakaTime. Tải lại trang để thử lại.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <WakaTimeConnectionCard connection={connection} timeZone={timeZone} />;
}

export function WakaTimeConnectionSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}
