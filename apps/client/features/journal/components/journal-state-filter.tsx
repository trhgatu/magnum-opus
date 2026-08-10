import type { JournalEntryState } from "@repo/contracts";
import Link from "next/link";

import { buildJournalHref } from "@/features/journal/lib/journal-url";

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
      className="flex overflow-x-auto rounded-xl border bg-card/50 p-1 text-sm"
    >
      {filters.map(([value, label]) => (
        <Link
          key={label}
          href={buildJournalHref({ search, state: value })}
          aria-current={state === value ? "page" : undefined}
          className={
            "shrink-0 rounded-lg px-3 py-1.5 transition-colors " +
            (state === value
              ? "bg-primary font-medium text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
