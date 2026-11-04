import type { JournalEntryResponse, MemoryResponse } from "@repo/contracts";
import { PenLine } from "lucide-react";
import Link from "next/link";

import { createJournalEntry } from "@/features/journal/actions/journal";
import { describeDaysAgo } from "@/features/today/lib/today-focus";

const PILL =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-paper-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/**
 * Thẻ Reflection, một tờ giấy: hôm nay đã viết chưa, và ký ức gần nhất.
 * Viết thì mở trình soạn nhật ký; ô viết nhanh ngay tại đây để sau.
 */
export function TodayReflection({
  entryToday,
  latestMemory,
  today,
  timeZone,
}: {
  entryToday: JournalEntryResponse | null;
  latestMemory: MemoryResponse | null;
  today: string;
  timeZone: string;
}) {
  return (
    <section
      aria-labelledby="today-reflection"
      className="flex flex-col gap-3 rounded-[20px] border border-paper-edge bg-paper px-6 py-6 text-paper-ink"
    >
      <p className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
        Reflection · trang hôm nay
      </p>
      <h2
        id="today-reflection"
        className="font-display text-[26px] leading-tight font-medium"
      >
        {entryToday
          ? (entryToday.title ?? "Hôm nay đã có một trang.")
          : "Điều gì đáng nhớ từ hôm qua?"}
      </h2>
      {entryToday ? (
        <p className="line-clamp-3 font-display text-lg leading-relaxed">
          {entryToday.content || "Trang còn trống, đang chờ vài dòng."}
        </p>
      ) : (
        <p className="text-sm">Vài dòng là đủ.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {latestMemory ? (
          <Link
            href={`/memories/${latestMemory.id}`}
            className="rounded-sm text-[13px] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-ink"
          >
            Ký ức gần nhất: {latestMemory.title} ·{" "}
            {describeDaysAgo(latestMemory.createdAt, today, timeZone)}
          </Link>
        ) : (
          <span className="text-[13px]">Chưa có ký ức nào.</span>
        )}
        {entryToday ? (
          <Link href={`/journal/${entryToday.id}`} className={PILL}>
            Mở trang hôm nay
          </Link>
        ) : (
          <form action={createJournalEntry}>
            <button type="submit" className={PILL}>
              <PenLine className="size-4" aria-hidden="true" /> Viết trang hôm
              nay
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
