import type { Metadata } from "next";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { getTimelineEntries } from "@/features/timeline/api/timeline";
import { TimelineEntryCard } from "@/features/timeline/components/timeline-entry-card";
import { TimelinePagination } from "@/features/timeline/components/timeline-pagination";
import { parseTimelineLocation } from "@/features/timeline/lib/timeline-url";

export const metadata: Metadata = {
  title: "Timeline",
  robots: {
    index: false,
    follow: false,
  },
};

interface TimelinePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TimelinePage({
  searchParams,
}: TimelinePageProps) {
  const location = parseTimelineLocation(await searchParams);

  const result = await getTimelineEntries({
    page: location.page,
    limit: 20,
  });

  return (
    <section className="flex flex-col gap-8" aria-labelledby="timeline-heading">
      <PageHeading
        id="timeline-heading"
        eyebrow="Reflection"
        title="Timeline"
        description="Những mốc Journal đã seal và Memory đã giữ lại, theo đúng thời điểm chúng xảy ra."
      />

      {result.data.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.meta.totalItems} mốc trên dòng thời gian
          </p>

          <div className="flex flex-col gap-3">
            {result.data.map((entry) => (
              <TimelineEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Timeline đang trống"
          description="Seal một Journal entry hoặc giữ lại một ký ức để bắt đầu dòng thời gian."
        />
      )}

      <TimelinePagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
      />
    </section>
  );
}
