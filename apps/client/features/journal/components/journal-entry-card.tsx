import type { JournalEntryResponse, JournalEntryState } from "@repo/contracts";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const stateLabels: Record<JournalEntryState, string> = {
  DRAFT: "Draft",
  SEALED: "Sealed",
  TRASHED: "Trash",
};

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function JournalEntryCard({ entry }: { entry: JournalEntryResponse }) {
  return (
    <Link
      href={`/journal/${entry.id}`}
      className="group flex min-h-48 flex-col rounded-2xl border bg-card/65 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-38px_color-mix(in_oklch,var(--foreground)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-3 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display line-clamp-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
          {entry.title || "Không có tiêu đề"}
        </h2>
        <Badge variant="outline" className="shrink-0">
          {stateLabels[entry.state]}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {entry.content || "Một trang trắng đang chờ được viết."}
      </p>
      <time
        className="mt-auto pt-6 font-mono text-[11px] text-muted-foreground"
        dateTime={entry.updatedAt}
      >
        Cập nhật {formatUpdatedAt(entry.updatedAt)}
      </time>
    </Link>
  );
}
