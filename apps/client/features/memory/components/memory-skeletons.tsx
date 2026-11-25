import { Skeleton } from "@/components/ui/skeleton";

export function MemoryMetaSkeleton() {
  return (
    <span className="inline-flex" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin ký ức…</span>
      <Skeleton className="h-5 w-48" aria-hidden="true" />
    </span>
  );
}

function MemoryRowsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-6 w-16" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-17 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function MemoryListSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải ký ức…</span>
      <MemoryRowsSkeleton />
    </div>
  );
}

function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap items-end justify-between gap-5"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-5 w-64" />
      </div>
      {action ? <Skeleton className="h-10 w-40 rounded-lg" /> : null}
    </div>
  );
}

export function MemoryCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang tải ký ức…</span>
      <PageHeaderSkeleton />
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-3 w-28" />
        <div className="flex flex-col gap-3 lg:flex-row">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-72 rounded-xl" />
        </div>
      </div>
      <MemoryRowsSkeleton />
    </section>
  );
}

export function MemoryDetailSkeleton() {
  return (
    <article
      className="flex w-full flex-col gap-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang mở ký ức…</span>
      <Skeleton aria-hidden="true" className="h-4 w-28" />
      <PageHeaderSkeleton />
      <div aria-hidden="true" className="flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-11/12" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    </article>
  );
}

export function MemoryFormSkeleton() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang chuẩn bị biểu mẫu ký ức…</span>
      <Skeleton aria-hidden="true" className="h-4 w-28" />
      <PageHeaderSkeleton action={false} />
      <div aria-hidden="true" className="flex w-full max-w-3xl flex-col gap-7">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </section>
  );
}
