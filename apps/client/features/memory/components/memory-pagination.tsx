import type { MemoryState } from "@repo/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  buildMemoryHref,
  type MemorySortField,
  type MemorySortOrder,
} from "@/features/memory/lib/memory-url";

interface MemoryPaginationProps {
  page: number;
  totalPages: number;
  search: string;
  state?: MemoryState;
  sortBy: MemorySortField;
  sortOrder: MemorySortOrder;
}

export function MemoryPagination({
  page,
  totalPages,
  search,
  state,
  sortBy,
  sortOrder,
}: MemoryPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Phân trang ký ức"
      className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-muted-foreground" aria-live="polite">
        Trang {page} / {totalPages}
      </span>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildMemoryHref({
              page: page - 1,
              search,
              state,
              sortBy,
              sortOrder,
            })}
            rel="prev"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Trang trước
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={buildMemoryHref({
              page: page + 1,
              search,
              state,
              sortBy,
              sortOrder,
            })}
            rel="next"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            Trang sau
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
