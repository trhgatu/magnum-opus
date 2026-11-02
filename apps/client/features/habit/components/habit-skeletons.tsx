import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Nằm trong thẻ <p> của tiêu đề trang, nên chỉ dùng <span>. */
export function HabitSummarySkeleton() {
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

function HabitRowsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      {[2, 2, 1].map((rows, group) => (
        <div key={group} className="flex flex-col gap-2.5">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 sm:px-5"
            >
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-3 w-[100px] sm:block" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HabitListSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách Thói quen…</span>
      <HabitRowsSkeleton />
    </div>
  );
}

export function HabitCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách Thói quen…</span>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-end justify-between gap-5"
      >
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-11 w-52" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl sm:w-72" />
      </div>
      <HabitRowsSkeleton />
    </section>
  );
}

export function HabitDetailSkeleton() {
  return (
    <section
      className="flex w-full flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang tải Thói quen…</span>
      <Skeleton aria-hidden="true" className="h-8 w-36" />
      <ContextHeroSkeleton />
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </section>
  );
}

export function HabitFormSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang chuẩn bị biểu mẫu Thói quen…</span>
      <ContextHeroSkeleton actions={false} metaCount={0} />
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl bg-card/70 ring-1 ring-foreground/10"
      >
        <div className="flex gap-3 border-b px-5 py-5 sm:px-7 sm:py-6">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="space-y-5 px-5 py-6 sm:px-7">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="space-y-4 border-y bg-muted/20 px-5 py-5 sm:px-7">
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-10 w-72 max-w-full" />
        </div>
        <div className="flex justify-end gap-3 bg-muted/30 px-5 py-4 sm:px-7">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </section>
  );
}
