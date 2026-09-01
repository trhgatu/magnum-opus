import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-7">
      <span className="sr-only">Đang tải những thực hành hôm nay…</span>
      <ContextHeroSkeleton actions={false} metaCount={2} />

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section
          key={sectionIndex}
          aria-hidden="true"
          className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b bg-muted/35 px-5 py-4">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          {Array.from({ length: 2 }).map((_, habitIndex) => (
            <div
              key={habitIndex}
              className="flex items-center gap-4 border-t px-5 py-4 first:border-t-0"
            >
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-8 w-24 sm:block" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
