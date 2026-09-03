import { Skeleton } from "@/components/ui/skeleton";

export default function MeLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-8"
      aria-label="Đang tải hồ sơ cá nhân…"
    >
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card/70">
        <dl className="divide-y" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid gap-2 px-5 py-5 sm:grid-cols-[12rem_1fr] sm:items-center sm:px-7"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40 sm:ml-auto" />
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
