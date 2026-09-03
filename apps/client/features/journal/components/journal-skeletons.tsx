import {
  CollectionDividerSkeleton,
  CollectionFilterBarSkeleton,
} from "@/components/system/collection-skeleton";
import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

function JournalEntryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-64 flex-col overflow-hidden rounded-2xl bg-card/75 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-auto h-px w-14" />
      </div>
      <div className="flex justify-between border-t bg-muted/30 px-5 py-3 sm:px-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function JournalMetaSkeleton() {
  return (
    <span className="flex gap-2" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin Nhật ký…</span>
      <Skeleton className="h-6 w-16 rounded-full" aria-hidden="true" />
      <Skeleton className="h-6 w-28 rounded-full" aria-hidden="true" />
    </span>
  );
}

function JournalEntryCardGridSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <JournalEntryCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function JournalListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Nhật ký…</span>
      <CollectionDividerSkeleton />
      <JournalEntryCardGridSkeleton />
    </div>
  );
}

export function JournalCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-7" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Nhật ký…</span>
      <ContextHeroSkeleton />
      <CollectionFilterBarSkeleton filterCount={1} />
      <CollectionDividerSkeleton />
      <JournalEntryCardGridSkeleton />
    </section>
  );
}

export function JournalEditorSkeleton() {
  return (
    <article
      className="mx-auto flex w-full max-w-5xl flex-col gap-5"
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
