import type { JournalEntryState } from "@repo/contracts";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { buildJournalHref } from "@/features/journal/lib/journal-url";

interface JournalPaginationProps {
  page: number;
  totalPages: number;
  search: string;
  state?: JournalEntryState;
}

export function JournalPagination({
  page,
  totalPages,
  search,
  state,
}: JournalPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Phân trang Journal"
      className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-muted-foreground" aria-live="polite">
        Trang {page} / {totalPages}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {page > 1 ? (
          <Link
            href={buildJournalHref({ page: page - 1, search, state })}
            className={buttonVariants({ variant: "outline" })}
          >
            Trang trước
          </Link>
        ) : (
          <span />
        )}
        {page < totalPages ? (
          <Link
            href={buildJournalHref({ page: page + 1, search, state })}
            className={buttonVariants({ variant: "outline" })}
          >
            Trang sau
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
