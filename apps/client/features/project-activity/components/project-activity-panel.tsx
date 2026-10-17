import type { ProjectActivityResponse } from "@repo/contracts";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ActivityDivergenceNotes, CycleActivity } from "./cycle-activity";

/**
 * null khi đọc lỗi. Trang bắt đầu đọc một lần rồi chia cho cả hai chỗ hiện
 * — mỗi chỗ chờ trong Suspense riêng, lỗi không lan ra phần còn lại.
 */
export type ProjectActivityRead = Promise<ProjectActivityResponse | null>;

export async function CycleActivityPanel({
  activity,
  resumeAction,
}: {
  activity: ProjectActivityRead;
  resumeAction: ReactNode;
}) {
  const data = await activity;
  if (!data) {
    return (
      <p className="mt-6 border-t pt-5 text-sm text-muted-foreground">
        Chưa tải được hoạt động của vòng này. Tải lại trang để thử lại.
      </p>
    );
  }
  // Chưa gắn nguồn nào thì không có gì để nói (06 §8).
  if (data.sources.length === 0 || !data.currentCycle) return null;
  return (
    <CycleActivity
      activity={data}
      cycle={data.currentCycle}
      now={new Date()}
      resumeAction={resumeAction}
    />
  );
}

export async function ActivityDivergencePanel({
  activity,
}: {
  activity: ProjectActivityRead;
}) {
  const data = await activity;
  return data ? <ActivityDivergenceNotes activity={data} /> : null;
}

export function CycleActivitySkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t pt-5" aria-hidden="true">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-3 w-full max-w-md" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
