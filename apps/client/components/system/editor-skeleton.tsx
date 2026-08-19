import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang mở entry…</span>

      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Skeleton className="h-9 w-24" />
        <div className="flex gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="rounded-3xl border bg-card/55 p-5 shadow-sm sm:p-8"
      >
        <Skeleton className="mb-6 h-10 w-2/3" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={index}
              className={index % 4 === 3 ? "h-4 w-3/5" : "h-4 w-full"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
