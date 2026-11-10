import type {
  JournalEntryResponse,
  MemoryResponse,
  OnThisDayItemResponse,
} from "@repo/contracts";
import Link from "next/link";

import { createJournalEntry } from "@/features/journal/actions/journal";
import { WriteTodayButton } from "@/features/today/components/write-today-button";
import { describeDaysAgo } from "@/features/today/lib/today-focus";
import { cn } from "@/lib/utils";

const PILL =
  "inline-flex min-h-11 disabled:cursor-progress disabled:opacity-70 items-center gap-2 rounded-full bg-paper-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** Số dòng "ngày này năm xưa" hiện trong thẻ; còn lại gói thành "và N mục khác". */
const ON_THIS_DAY_SHOWN = 3;

const LINK =
  "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-ink";

function onThisDayLabel(item: OnThisDayItemResponse): string {
  if (item.title) return item.title;
  return item.excerpt
    ? `Trang nhật ký: “${item.excerpt}”`
    : "Một trang nhật ký";
}

/** Đúng ngày này ở các năm trước: gần nhất trước, mỗi dòng mở ký ức hay trang. */
function OnThisDay({ items }: { items: readonly OnThisDayItemResponse[] }) {
  const shown = items.slice(0, ON_THIS_DAY_SHOWN);
  const more = items.length - shown.length;
  return (
    <section
      aria-labelledby="today-on-this-day"
      className="flex flex-col gap-1.5"
    >
      <h3
        id="today-on-this-day"
        className="font-mono text-[11px] font-medium tracking-[0.16em] uppercase"
      >
        Ngày này năm xưa
      </h3>
      <ul className="flex flex-col gap-1 text-[13px]">
        {shown.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex min-w-0 gap-2">
            <span className="shrink-0 tabular-nums opacity-70">
              {item.yearsAgo} năm trước ·
            </span>
            <Link
              href={
                item.kind === "MEMORY"
                  ? `/memories/${item.id}`
                  : `/journal/${item.id}`
              }
              className={cn(LINK, "truncate")}
            >
              {onThisDayLabel(item)}
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <p className="text-[13px] opacity-70">và {more} mục khác</p>
      ) : null}
    </section>
  );
}

/**
 * Thẻ Reflection, một tờ giấy: hôm nay đã viết chưa, và ký ức gần nhất.
 * Có gì của đúng ngày này ở các năm trước thì nó thay chỗ ký ức gần nhất.
 * Viết thì mở trình soạn nhật ký; ô viết nhanh ngay tại đây để sau.
 */
export function TodayReflection({
  entryToday,
  latestMemory,
  onThisDay = [],
  today,
  timeZone,
}: {
  entryToday: JournalEntryResponse | null;
  latestMemory: MemoryResponse | null;
  /** Rỗng khi không có gì, hoặc khi không tải được: thẻ vẫn như cũ. */
  onThisDay?: readonly OnThisDayItemResponse[];
  today: string;
  timeZone: string;
}) {
  return (
    <section
      aria-labelledby="today-reflection"
      className="flex h-full flex-col gap-3 rounded-3xl border border-paper-edge bg-paper px-6 py-6 text-paper-ink"
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

      {/* Đẩy xuống đáy thẻ khi thẻ cao hơn nội dung (hàng hai thẻ bằng nhau). */}
      {onThisDay.length > 0 ? (
        <div className="mt-auto pt-1">
          <OnThisDay items={onThisDay} />
        </div>
      ) : null}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 pt-1",
          onThisDay.length > 0 ? "justify-end" : "mt-auto justify-between",
        )}
      >
        {onThisDay.length > 0 ? null : latestMemory ? (
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
            <WriteTodayButton className={PILL} />
          </form>
        )}
      </div>
    </section>
  );
}
