import Link from "next/link";

import type { JournalDay } from "@/features/journal/lib/journal-groups";
import { moodOption } from "@/features/mood/config/mood-labels";

const STATE_NOTE = {
  DRAFT: "Nháp",
  SEALED: null,
  TRASHED: "Thùng rác",
} as const;

/**
 * Một trang trong Nhật ký (thiết kế "Nhật ký", Figma): ngày lớn bên trái,
 * tiêu đề, tâm trạng, đoạn trích và số ký ức đã giữ lại từ trang.
 */
export function JournalDayRow({ day }: { day: JournalDay }) {
  const { entry } = day;
  const mood = entry.mood ? moodOption(entry.mood) : null;
  const note = STATE_NOTE[entry.state];

  return (
    <li className="border-b">
      <Link
        href={`/journal/${entry.id}`}
        className="group flex gap-5 rounded-sm py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-8"
      >
        <span className="flex w-12 shrink-0 flex-col sm:w-16">
          <span className="font-display text-4xl leading-none tabular-nums">
            {day.day}
          </span>
          <span className="mt-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
            {day.weekday}
          </span>
        </span>
        <span className="flex min-w-0 max-w-3xl flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-display text-xl tracking-[-0.01em] transition-colors group-hover:text-primary">
              {entry.title || "Không có tiêu đề"}
            </span>
            {mood ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {mood.label}
              </span>
            ) : null}
            {note ? (
              <span className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {note}
              </span>
            ) : null}
          </span>
          {entry.content ? (
            <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {entry.content}
            </span>
          ) : null}
          {entry.memoryCount > 0 ? (
            <span className="text-xs text-primary">
              Đã giữ lại {entry.memoryCount} ký ức từ trang này
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
