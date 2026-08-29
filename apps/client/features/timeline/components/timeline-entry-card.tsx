import type { TimelineEntryResponse } from "@repo/contracts";
import { ArrowUpRight, BookOpenText, Gem } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const entryTypeConfig = {
  JOURNAL_SEALED: {
    icon: BookOpenText,
    label: "Nhật ký",
    hrefPrefix: "/journal",
  },
  MEMORY_CREATED: {
    icon: Gem,
    label: "Ký ức",
    hrefPrefix: "/memories",
  },
} as const;

const formatOccurredOn = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function TimelineEntryCard({
  entry,
  index = 0,
}: {
  entry: TimelineEntryResponse;
  index?: number;
}) {
  const config = entryTypeConfig[entry.entryType];
  const Icon = config.icon;
  const title = entry.title ?? "Nội dung đã bị xóa";

  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary"
      >
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{config.label}</Badge>
          {!entry.sourceExists ? (
            <Badge variant="destructive">Đã xóa</Badge>
          ) : null}
        </div>

        <h2 className="mt-3 line-clamp-2 font-display text-xl font-semibold tracking-tight text-balance">
          {title}
        </h2>

        <time
          dateTime={entry.occurredOn}
          className="mt-1 block font-mono text-xs text-muted-foreground"
        >
          {formatOccurredOn(entry.occurredOn)}
        </time>
      </div>
      {entry.sourceExists ? (
        <ArrowUpRight
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  const marker = (
    <div
      className="relative z-10 flex w-10 shrink-0 justify-center sm:w-12"
      aria-hidden="true"
    >
      <span className="mt-6 size-2.5 rounded-full border-2 border-background bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]" />
    </div>
  );

  if (!entry.sourceExists) {
    return (
      <div className="relative flex items-stretch">
        {marker}
        <div className="flex min-w-0 flex-1 items-start rounded-2xl border bg-card/45 p-5 opacity-70 sm:p-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-stretch">
      {marker}
      <Link
        href={`${config.hrefPrefix}/${entry.sourceId}`}
        aria-label={`Mở ${config.label.toLowerCase()}: ${title}`}
        className="group min-w-0 flex-1 rounded-2xl border bg-card/70 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 motion-reduce:transform-none sm:p-6"
      >
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Record {String(index + 1).padStart(2, "0")}
        </div>
        {content}
      </Link>
    </div>
  );
}
