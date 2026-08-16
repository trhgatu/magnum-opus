import type { JournalEntryState } from "@repo/contracts";
import Link from "next/link";

import { buildJournalHref } from "@/features/journal/lib/journal-url";
import { cn } from "@/lib/utils";

const filters = [
  [undefined, "Đang lưu giữ"],
  ["DRAFT", "Draft"],
  ["SEALED", "Sealed"],
  ["TRASHED", "Trash"],
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
      aria-label="Lọc Journal theo trạng thái"
      className="flex max-w-full overflow-x-auto rounded-lg border bg-background/70 p-0.5 text-sm"
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
              "shrink-0 rounded-md px-2.5 py-1.5 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
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
