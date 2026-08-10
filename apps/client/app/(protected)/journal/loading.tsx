import { Skeleton } from "@/components/ui/skeleton";

export default function JournalLoading() {
  return (
    <section
      className="flex flex-col gap-8"
      role="status"
      aria-label="Đang tải Journal"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-48" />
          <Skeleton className="h-5 w-full max-w-xl sm:w-[32rem]" />
        </div>
        <Skeleton className="h-11 w-full sm:w-40" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full lg:w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="min-h-48 space-y-5 rounded-2xl border bg-card/45 p-6"
          >
            <div className="flex justify-between gap-4">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-auto h-3 w-36" />
          </div>
        ))}
      </div>
    </section>
  );
}
