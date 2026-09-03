import {
  CollectionDividerSkeleton,
  CollectionFilterBarSkeleton,
} from "@/components/system/collection-skeleton";
import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

function MemoryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-72 flex-col overflow-hidden rounded-2xl bg-card/75 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-6">
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Skeleton className="mt-auto h-px w-14" />
      </div>
      <div className="flex justify-between border-t bg-muted/30 px-5 py-3 sm:px-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function MemoryMetaSkeleton() {
  return (
    <span className="flex gap-2" aria-hidden="true">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-28 rounded-full" />
    </span>
  );
}

export function MemoryListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Đang tải ký ức…</span>
      <div className="flex items-center gap-3" aria-hidden="true">
        <Skeleton className="h-3 w-32" />
        <span className="h-px flex-1 bg-border" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <MemoryCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function MemoryCollectionSkeleton() {
  return (
    <section className="flex flex-col gap-7" role="status" aria-live="polite">
      <span className="sr-only">Đang tải ký ức…</span>
      <ContextHeroSkeleton />
      <CollectionFilterBarSkeleton />
      <CollectionDividerSkeleton />
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <MemoryCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

export function MemoryDetailSkeleton() {
  return (
    <article
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang mở ký ức…</span>
      <div aria-hidden="true" className="flex justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-52" />
      </div>
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl border bg-card/70 shadow-sm"
      >
        <div className="flex justify-between border-b bg-muted/20 px-6 py-3 sm:px-10">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="min-h-[28rem] px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-6 h-12 w-3/4" />
          <Skeleton className="mt-9 h-px w-full" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function MemoryFormSkeleton() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang chuẩn bị biểu mẫu ký ức…</span>
      <ContextHeroSkeleton actions={false} metaCount={0} />
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border bg-card/70 shadow-sm"
      >
        <div className="border-b bg-muted/20 px-5 py-3 sm:px-8">
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="space-y-7 p-5 sm:p-8">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </section>
  );
}
