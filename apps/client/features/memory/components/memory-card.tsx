import type { MemoryResponse } from "@repo/contracts";
import Link from "next/link";

import {
  formatMemoryOccurredOn,
  memoryOccurredOnDateTime,
} from "@/features/memory/lib/memory-date";

interface MemoryCardProps {
  memory: MemoryResponse;
}

/**
 * Một ký ức trong hồ sơ (thiết kế "Ký ức", Figma): ngày xảy ra, tiêu đề và
 * đoạn trích; ký ức kết tinh từ Nhật ký có thêm dòng nguồn ở chân thẻ.
 */
export function MemoryCard({ memory }: MemoryCardProps) {
  const occurredOnLabel = formatMemoryOccurredOn(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );
  const occurredOnDateTime = memoryOccurredOnDateTime(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );
  const trashed = memory.state === "TRASHED";

  return (
    <Link
      href={`/memories/${memory.id}`}
      aria-label={`Mở ký ức: ${memory.title}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article className="flex flex-col gap-2.5 rounded-2xl border bg-card px-5 py-5 transition-colors group-hover:border-primary/40 sm:px-6">
        <header className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
          {occurredOnDateTime ? (
            <time dateTime={occurredOnDateTime}>{occurredOnLabel}</time>
          ) : (
            <span>{occurredOnLabel}</span>
          )}
          {trashed ? <span>Thùng rác</span> : null}
        </header>
        <h3 className="line-clamp-2 font-display text-xl leading-snug font-medium tracking-[-0.01em] text-balance">
          {memory.title}
        </h3>
        <p className="line-clamp-3 font-display leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {memory.content}
        </p>
        {memory.sourceJournalEntryId ? (
          <footer className="mt-1 border-t pt-2.5 text-sm text-muted-foreground">
            Từ Nhật ký
          </footer>
        ) : null}
      </article>
    </Link>
  );
}
