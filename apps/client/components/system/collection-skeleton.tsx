import { Skeleton } from "@/components/ui/skeleton";

export function CollectionFilterBarSkeleton({
  filterCount = 2,
}: {
  filterCount?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
    >
      <Skeleton className="mb-3 h-3 w-28" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: filterCount }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-48 max-w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CollectionDividerSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-px flex-1" />
    </div>
  );
}
