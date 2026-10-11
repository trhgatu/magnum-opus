import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải cài đặt…"
      className="flex flex-col gap-8"
    >
      <div className="max-w-2xl space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-3 rounded-2xl border bg-card/70 px-5 py-5 sm:px-7">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
