import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { buildTimelineHref } from "@/features/timeline/lib/timeline-url";

interface TimelinePaginationProps {
  page: number;
  totalPages: number;
}

export function TimelinePagination({
  page,
  totalPages,
}: TimelinePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Phân trang Dòng thời gian"
      className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-muted-foreground" aria-live="polite">
        Trang {page} / {totalPages}
      </span>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildTimelineHref(page - 1)}
            rel="prev"
            className={buttonVariants({ variant: "outline" })}
          >
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Trang trước
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={buildTimelineHref(page + 1)}
            rel="next"
            className={buttonVariants({ variant: "outline" })}
          >
            Trang sau
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
