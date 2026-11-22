import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-7" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Khu vườn…</span>
      <ContextHeroSkeleton actions={false} metaCount={0} />
      <Skeleton className="h-[clamp(360px,62vw,620px)] w-full rounded-none" />
    </div>
  );
}
