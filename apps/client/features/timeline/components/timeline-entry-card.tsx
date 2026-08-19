import type { TimelineEntryResponse } from "@repo/contracts";
import { BookOpenText, Gem } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const entryTypeConfig = {
  JOURNAL_SEALED: {
    icon: BookOpenText,
    label: "Journal",
    hrefPrefix: "/journal",
  },
  MEMORY_CREATED: {
    icon: Gem,
    label: "Memory",
    hrefPrefix: "/memories",
  },
} as const;

const formatOccurredOn = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function TimelineEntryCard({ entry }: { entry: TimelineEntryResponse }) {
  const config = entryTypeConfig[entry.entryType];
  const Icon = config.icon;
  const title = entry.title ?? "Nội dung đã bị xóa";

  const content = (
    <>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{config.label}</Badge>
          {!entry.sourceExists ? (
            <Badge variant="destructive">Đã xóa</Badge>
          ) : null}
        </div>

        <h2 className="mt-2 line-clamp-2 font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>

        <time
          dateTime={entry.occurredOn}
          className="mt-1 block font-mono text-xs text-muted-foreground"
        >
          {formatOccurredOn(entry.occurredOn)}
        </time>
      </div>
    </>
  );

  if (!entry.sourceExists) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border bg-card/45 p-5 opacity-70 sm:p-6">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`${config.hrefPrefix}/${entry.sourceId}`}
      aria-label={`Mở ${config.label.toLowerCase()}: ${title}`}
      className="group flex items-start gap-4 rounded-2xl border bg-card/70 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-38px_color-mix(in_oklch,var(--foreground)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-3 sm:p-6"
    >
      {content}
    </Link>
  );
}
