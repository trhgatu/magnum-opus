import { Skeleton } from "@/components/ui/skeleton";

/** Nằm trong thẻ <p> của đầu trang, nên chỉ dùng <span>. */
export function TodaySummarySkeleton() {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <span className="sr-only">Đang tải tóm tắt hôm nay…</span>
      <span
        aria-hidden="true"
        className="inline-block h-5 w-72 max-w-full animate-pulse rounded-md bg-muted"
      />
    </span>
  );
}

export function TodayRhythmSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Đang tải nhịp hôm nay…</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-7 w-44" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 sm:px-5"
            >
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Chỗ của một thẻ cột phải (Crucible, Reflection) khi đang tải. */
export function TodayCardSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden="true" className="h-56 w-full rounded-3xl" />
    </div>
  );
}

export function TodayPageSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div aria-hidden="true" className="flex max-w-3xl flex-col gap-3.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-28 w-full max-w-xl" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <TodayRhythmSkeleton />
        <div aria-hidden="true" className="flex flex-col gap-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
