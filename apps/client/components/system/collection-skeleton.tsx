import { PageHeading } from "@/components/system/page-heading";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionSkeletonProps {
  eyebrow: string;
  title: string;
  description: string;
  cardCount?: number;
}

export function CollectionSkeleton({
  eyebrow,
  title,
  description,
  cardCount = 6,
}: CollectionSkeletonProps) {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách…</span>

      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Skeleton aria-hidden="true" className="h-10 w-36" />}
      />

      <div
        aria-hidden="true"
        className="rounded-2xl border bg-card/35 p-3 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cardCount }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
