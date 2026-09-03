import {
  CollectionDividerSkeleton,
  CollectionFilterBarSkeleton,
} from "@/components/system/collection-skeleton";
import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

function HabitCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-64 flex-col overflow-hidden rounded-2xl bg-card/75 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-8">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-auto h-4 w-40" />
      </div>
      <div className="flex items-center justify-between border-t bg-muted/35 px-5 py-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function HabitMetaSkeleton() {
  return (
    <span className="flex gap-2" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin Thói quen…</span>
      <Skeleton className="h-6 w-24 rounded-full" aria-hidden="true" />
      <Skeleton className="h-6 w-28 rounded-full" aria-hidden="true" />
    </span>
  );
}

function HabitCardGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <HabitCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HabitListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách Thói quen…</span>
      <CollectionDividerSkeleton />
      <HabitCardGridSkeleton />
    </div>
  );
}

export function HabitCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-7" role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách Thói quen…</span>
      <ContextHeroSkeleton />
      <CollectionFilterBarSkeleton />
      <CollectionDividerSkeleton />
      <HabitCardGridSkeleton />
    </section>
  );
}

export function HabitDetailSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
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
