import { Skeleton } from "@/components/ui/skeleton";

export default function ChronicleLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-7">
      <span className="sr-only">Đang tải Chronicle…</span>
      <Skeleton className="h-56 w-full rounded-3xl" aria-hidden="true" />
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div
          key={groupIndex}
          aria-hidden="true"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
