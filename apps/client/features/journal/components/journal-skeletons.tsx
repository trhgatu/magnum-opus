import { Skeleton } from "@/components/ui/skeleton";

export function JournalMetaSkeleton() {
  return (
    <span className="inline-flex" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin Nhật ký…</span>
      <Skeleton className="h-5 w-56" aria-hidden="true" />
    </span>
  );
}

export function JournalTodaySkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải trang hôm nay…</span>
      <Skeleton aria-hidden="true" className="h-24 w-full rounded-3xl" />
    </div>
  );
}

function JournalMonthSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <Skeleton className="mb-3 h-7 w-40" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-5 border-t py-5 sm:gap-8">
          <div className="flex w-12 flex-col gap-2 sm:w-16">
            <Skeleton className="h-9 w-10" />
            <Skeleton className="h-3 w-6" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function JournalListSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải Nhật ký…</span>
      <JournalMonthSkeleton />
    </div>
  );
}

export function JournalCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Nhật ký…</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton aria-hidden="true" className="h-24 w-full rounded-3xl" />
      <div aria-hidden="true" className="flex flex-col gap-3 lg:flex-row">
        <Skeleton className="h-10 w-full rounded-lg lg:max-w-sm" />
        <Skeleton className="h-10 w-72 rounded-xl lg:ml-auto" />
      </div>
      <JournalMonthSkeleton />
    </section>
  );
}

export function JournalEditorSkeleton() {
  return (
    <article
      className="flex w-full flex-col gap-5"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang mở trang Nhật ký…</span>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card/80 p-2.5 shadow-sm"
      >
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-3 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl border bg-card/70 shadow-sm"
      >
        <div className="border-b bg-muted/20 px-6 py-3 sm:px-10">
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="min-h-[58vh] px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="mt-7 h-px w-full" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-10/12" />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    </article>
  );
}
