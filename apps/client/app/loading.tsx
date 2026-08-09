import { BrandMark } from "@/components/system/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="mb-8 flex items-center gap-3 text-muted-foreground">
        <BrandMark className="animate-pulse" />
        <span className="text-sm">Đang mở không gian của mày…</span>
      </div>
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </main>
  );
}
