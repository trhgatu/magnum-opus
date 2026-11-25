import type { JournalEntryState } from "@repo/contracts";
import Link from "next/link";

import { buildJournalHref } from "@/features/journal/lib/journal-url";
import { cn } from "@/lib/utils";

const filters = [
  [undefined, "Tất cả"],
  ["DRAFT", "Nháp"],
  ["SEALED", "Đã niêm phong"],
] as const;

export function JournalStateFilter({
  search,
  state,
}: {
  search: string;
  state?: JournalEntryState;
}) {
  return (
    <nav
      aria-label="Lọc Nhật ký theo trạng thái"
      className="flex max-w-full gap-1.5 overflow-x-auto text-sm"
    >
      {filters.map(([value, label]) => {
        const active = state === value;

        return (
          <Link
            key={label}
            href={buildJournalHref({
              search,
              state: value,
            })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-xl px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
