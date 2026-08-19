import { PageHeading } from "@/components/system/page-heading";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="flex flex-col gap-8" role="status" aria-live="polite">
      <span className="sr-only">Đang tải Timeline…</span>

      <PageHeading
        eyebrow="Reflection"
        title="Timeline"
        description="Những mốc Journal đã seal và Memory đã giữ lại, theo đúng thời điểm chúng xảy ra."
      />

      <div aria-hidden="true" className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
