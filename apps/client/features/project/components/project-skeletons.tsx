import { Skeleton } from "@/components/ui/skeleton";

export function ProjectMetaSkeleton() {
  return (
    <span className="inline-flex" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thông tin Project…</span>
      <Skeleton className="h-5 w-48" aria-hidden="true" />
    </span>
  );
}

export function ProjectRunningSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Đang tải Project đang luyện…</span>
      <Skeleton aria-hidden="true" className="h-3 w-28" />
      <Skeleton aria-hidden="true" className="h-56 w-full rounded-3xl" />
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2.5">
      <span className="sr-only">Đang tải danh sách Project…</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={index}
          aria-hidden="true"
          className="h-17 w-full rounded-2xl"
        />
      ))}
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <section
      className="flex w-full flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang tải Project…</span>
      <Skeleton aria-hidden="true" className="h-8 w-36" />

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl bg-card/65 ring-1 ring-foreground/10"
      >
        <div className="border-b px-5 py-5 sm:px-7">
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

export function ProjectFormSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang chuẩn bị biểu mẫu Project…</span>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl bg-card/70 ring-1 ring-foreground/10"
      >
        <div className="flex gap-3 border-b px-5 py-5 sm:px-7 sm:py-6">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="space-y-3 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="mt-5 h-24 w-full rounded-2xl" />
        </div>
        <div className="flex justify-end gap-3 border-t bg-muted/30 px-5 py-4 sm:px-7">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </section>
  );
}
