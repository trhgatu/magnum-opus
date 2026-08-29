import type { JournalEntryResponse, JournalEntryState } from "@repo/contracts";
import { ArrowUpRight, LockKeyhole, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const stateLabels: Record<JournalEntryState, string> = {
  DRAFT: "Nháp",
  SEALED: "Đã niêm phong",
  TRASHED: "Thùng rác",
};

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const stateIcons = {
  DRAFT: PenLine,
  SEALED: LockKeyhole,
  TRASHED: Trash2,
} satisfies Record<JournalEntryState, typeof PenLine>;

export function JournalEntryCard({
  entry,
  index = 0,
}: {
  entry: JournalEntryResponse;
  index?: number;
}) {
  const StateIcon = stateIcons[entry.state];

  return (
    <Link
      href={`/journal/${entry.id}`}
      className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3"
    >
      <Card className="relative min-h-64 gap-0 overflow-hidden rounded-2xl bg-card/75 py-0 transition duration-200 group-hover:-translate-y-1 group-hover:ring-primary/30 group-hover:shadow-lg motion-reduce:transform-none">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-primary/25"
        />
        <CardHeader className="flex-row items-center justify-between gap-3 px-5 pb-0 pt-5 sm:px-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Trang {String(index + 1).padStart(2, "0")}
          </span>
          <Badge variant="outline" className="shrink-0">
            <StateIcon className="size-3" aria-hidden="true" />
            {stateLabels[entry.state]}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-6">
          <h2 className="font-display line-clamp-2 text-2xl font-semibold tracking-tight text-balance transition-colors group-hover:text-primary">
            {entry.title || "Không có tiêu đề"}
          </h2>
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {entry.content || "Một trang trắng đang chờ được viết."}
          </p>
          <span
            className="mt-auto h-px w-14 bg-primary/25"
            aria-hidden="true"
          />
        </CardContent>
        <CardFooter className="justify-between bg-muted/30 px-5 py-3 sm:px-6">
          <time
            className="font-mono text-[11px] text-muted-foreground"
            dateTime={entry.updatedAt}
          >
            {formatUpdatedAt(entry.updatedAt)}
          </time>
          <span className="flex items-center gap-1 text-xs font-medium text-foreground/70 transition-colors group-hover:text-primary">
            Mở trang <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
