import type { ChronicleResponse, ForgeTodayResponse } from "@repo/contracts";
import { Clock3, Lock, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { getChronicle } from "@/features/chronicle/api/chronicle";
import { ChronicleMonthNav } from "@/features/chronicle/components/chronicle-month-nav";
import { ChronicleMonthPicker } from "@/features/chronicle/components/chronicle-month-picker";
import { ChronicleOverview } from "@/features/chronicle/components/chronicle-overview";
import {
  type ChronicleMonth,
  compareMonths,
  formatChronicleMonth,
  monthOfDay,
  parseChronicleMonth,
} from "@/features/chronicle/lib/chronicle-month";
import { getToday } from "@/features/today/api/today";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Chronicle",
  robots: { index: false, follow: false },
};

const MONTH_REJECTED_CODES = new Set([
  "CHRONICLE_MONTH_IN_FUTURE",
  "CHRONICLE_INVALID_MONTH",
]);

function isEmptyMonth(chronicle: ChronicleResponse): boolean {
  const { habit, routine, project, journal, mood, memory } = chronicle;

  return (
    habit.buildCompletionRate === 0 &&
    habit.bestStreak === null &&
    habit.mostConsistentHabit === null &&
    habit.quitHabits.length === 0 &&
    routine.completionRate === 0 &&
    project.activeCount + project.completedCount + project.stoppedCount === 0 &&
    journal.entryCount === 0 &&
    mood.dominantMood === null &&
    memory.memoryCount === 0
  );
}

/** "22:13 · 09/10/2026" theo múi giờ owner. */
function formatFrozenAt(computedAt: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(computedAt));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("hour")}:${part("minute")} · ${part("day")}/${part("month")}/${part("year")}`;
}

/**
 * null khi API từ chối tháng (tương lai hoặc không hợp lệ theo múi giờ
 * owner) — trang chuyển về tháng hiện tại thay vì báo lỗi (KD-CHR-007).
 * redirect() hoạt động bằng cách ném lỗi nên không gọi trong try/catch.
 */
async function loadChronicle(
  month: ChronicleMonth,
): Promise<{ chronicle: ChronicleResponse; today: ForgeTodayResponse } | null> {
  try {
    const [chronicle, today] = await Promise.all([
      getChronicle(month.year, month.month),
      getToday(),
    ]);

    return { chronicle, today };
  } catch (error) {
    if (
      error instanceof ApiError &&
      MONTH_REJECTED_CODES.has(error.code ?? "")
    ) {
      return null;
    }

    throw error;
  }
}

export default async function ChronicleMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const requested = parseChronicleMonth(year, month);

  if (!requested) {
    redirect("/chronicle");
  }

  const loaded = await loadChronicle(requested);

  if (!loaded) {
    redirect("/chronicle");
  }

  const { chronicle, today } = loaded;
  const currentMonth = monthOfDay(today.date);

  const isCurrentMonth = compareMonths(requested, currentMonth) === 0;
  const frozenAt = formatFrozenAt(chronicle.computedAt, today.timeZone);

  return (
    <section
      className="flex flex-col gap-7"
      aria-labelledby="chronicle-heading"
    >
      <ContextHero
        id="chronicle-heading"
        icon={ScrollText}
        eyebrow="Chronicle · Nhìn lại"
        title={formatChronicleMonth(requested)}
        description="Bức tranh một tháng: thói quen, nếp sinh hoạt, project và những gì đã ghi lại."
        meta={
          isCurrentMonth ? (
            <Badge variant="secondary">
              <Clock3 aria-hidden="true" />
              Đang diễn ra · tính tới hôm nay
            </Badge>
          ) : (
            <Badge variant="outline">
              <Lock aria-hidden="true" />
              Đã khép lại · chốt lúc {frozenAt}
            </Badge>
          )
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ChronicleMonthNav
              month={requested}
              isCurrentMonth={isCurrentMonth}
            />
            <ChronicleMonthPicker
              month={requested}
              currentMonth={currentMonth}
            />
          </div>
        }
      />

      {isEmptyMonth(chronicle) ? (
        <p className="text-sm text-muted-foreground">
          Tháng này chưa có ghi nhận nào.
        </p>
      ) : null}

      <ChronicleOverview chronicle={chronicle} />
    </section>
  );
}
