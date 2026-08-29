import { Skeleton } from "@/components/ui/skeleton";

export function ContextHeroSkeleton({
  actions = true,
  metaCount = 2,
}: {
  actions?: boolean;
  metaCount?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-3xl border bg-card/80 px-5 py-6 shadow-sm sm:px-8 sm:py-8"
    >
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-px w-10" />
          </div>
          <Skeleton className="h-12 w-3/4 max-w-xl sm:h-14" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-4/5 max-w-xl" />
          </div>
          {metaCount > 0 ? (
            <div className="mt-6 flex gap-2">
              {Array.from({ length: metaCount }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-24 rounded-full" />
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <Skeleton className="h-9 w-32" /> : null}
      </div>
    </div>
  );
}
