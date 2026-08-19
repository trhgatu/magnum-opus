import { Skeleton } from "@/components/ui/skeleton";

export function ArticleSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Đang tải ký ức…</span>

      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div
        aria-hidden="true"
        className="rounded-3xl border bg-card/60 px-5 py-8 shadow-sm sm:px-10 sm:py-12"
      >
        <div className="space-y-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-2/3" />
        </div>
        <div className="mt-9 space-y-3 border-t pt-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className={index === 5 ? "h-4 w-4/5" : "h-4 w-full"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
