import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function TimelineMetaSkeleton() {
  return (
    <span className="flex gap-2" aria-hidden="true">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-32 rounded-full" />
    </span>
  );
}

export function TimelineListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Dòng thời gian…</span>
      <div aria-hidden="true" className="flex items-center gap-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-px flex-1" />
      </div>
      <div
        aria-hidden="true"
        className="relative flex flex-col gap-4 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-border sm:before:left-6"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="relative flex items-stretch">
            <div className="relative z-10 flex w-10 justify-center sm:w-12">
              <Skeleton className="mt-6 size-2.5 rounded-full" />
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border bg-card/70 p-5 sm:p-6">
              <Skeleton className="h-3 w-20" />
              <div className="mt-4 flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <section className="flex flex-col gap-7" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Dòng thời gian…</span>
      <ContextHeroSkeleton actions={false} />
      <div aria-hidden="true" className="flex items-center gap-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-px flex-1" />
      </div>
      <div
        aria-hidden="true"
        className="relative flex flex-col gap-4 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-border sm:before:left-6"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="relative flex items-stretch">
            <div className="relative z-10 flex w-10 justify-center sm:w-12">
              <Skeleton className="mt-6 size-2.5 rounded-full" />
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border bg-card/70 p-5 sm:p-6">
              <Skeleton className="h-3 w-20" />
              <div className="mt-4 flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
