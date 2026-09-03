import { ContextHeroSkeleton } from "@/components/system/context-hero-skeleton";
import { TodayBoardSkeleton } from "@/features/today/components/today-skeletons";

export default function TodayLoading() {
  return (
    <div className="flex flex-col gap-7">
      <ContextHeroSkeleton actions={false} metaCount={2} />
      <TodayBoardSkeleton />
    </div>
  );
}
