import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { getTimelineEntries } from "@/features/timeline/api/timeline";
import { TimelineEntryCard } from "@/features/timeline/components/timeline-entry-card";
import {
  TimelineListSkeleton,
  TimelineMetaSkeleton,
} from "@/features/timeline/components/timeline-skeleton";
import { TimelinePagination } from "@/features/timeline/components/timeline-pagination";
import { parseTimelineLocation } from "@/features/timeline/lib/timeline-url";

export const metadata: Metadata = {
  title: "Dòng thời gian",
  robots: {
    index: false,
    follow: false,
  },
};

interface TimelinePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function TimelineMeta({
  entriesPromise,
}: {
  entriesPromise: ReturnType<typeof getTimelineEntries>;
}) {
  const result = await entriesPromise;
  return (
    <>
      <Badge variant="outline">{result.meta.totalItems} dấu mốc</Badge>
      <Badge variant="secondary">Theo dòng thời gian</Badge>
    </>
  );
}

async function TimelineList({
  entriesPromise,
}: {
  entriesPromise: ReturnType<typeof getTimelineEntries>;
}) {
  const result = await entriesPromise;

  return (
    <>
      {result.data.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Biên niên cá nhân
              <span className="sr-only">
                {" "}
                — {result.meta.totalItems} kết quả
              </span>
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="relative flex flex-col gap-4">
            {result.data.map((entry, index) => (
              <TimelineEntryCard
                key={entry.id}
                entry={entry}
                index={index}
                isLast={index === result.data.length - 1}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Dòng thời gian đang trống"
          description="Niêm phong một Nhật ký hoặc giữ lại một ký ức để bắt đầu dòng thời gian."
        />
      )}

      <TimelinePagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
      />
    </>
  );
}

export default async function TimelinePage({
  searchParams,
}: TimelinePageProps) {
  const location = parseTimelineLocation(await searchParams);
  // Một promise dùng chung cho cả badge tổng số lẫn danh sách — apiFetch
  // không dedupe theo URL (x-correlation-id random mỗi lần), nên gọi lại
  // getTimelineEntries() ở hai nơi sẽ tốn 2 round-trip thật thay vì được
  // cache lại.
  const entriesPromise = getTimelineEntries({
    page: location.page,
    limit: 20,
  });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="timeline-heading">
      <ContextHero
        id="timeline-heading"
        icon={Clock3}
        eyebrow="Reflection · Chronology"
        title="Dòng thời gian"
        description="Từng trang viết được niêm phong, từng mảnh ký ức ở lại đúng vị trí của thời gian."
        meta={
          <Suspense fallback={<TimelineMetaSkeleton />}>
            <TimelineMeta entriesPromise={entriesPromise} />
          </Suspense>
        }
      />

      <Suspense fallback={<TimelineListSkeleton />}>
        <TimelineList entriesPromise={entriesPromise} />
      </Suspense>
    </section>
  );
}
