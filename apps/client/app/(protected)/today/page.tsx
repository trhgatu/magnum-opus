import type { Metadata } from "next";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/account/api/current-user";
import { TimeZoneMismatchNotice } from "@/features/account/components/time-zone-mismatch-notice";
import { getHabitOverview } from "@/features/habit/api/habit";
import { getToday } from "@/features/today/api/today";
import { TodayRhythm } from "@/features/today/components/today-rhythm";
import {
  TodayRhythmSkeleton,
  TodaySummarySkeleton,
} from "@/features/today/components/today-skeletons";
import {
  formatTodayLabel,
  greetingAt,
  todayHabits,
} from "@/features/today/lib/today-plan";

export const metadata: Metadata = {
  title: "Hôm nay",
  robots: { index: false, follow: false },
};

type Load = Promise<
  [
    Awaited<ReturnType<typeof getToday>>,
    Awaited<ReturnType<typeof getHabitOverview>>,
  ]
>;

async function Summary({ load }: { load: Load }) {
  const [today, overview] = await load;
  const habits = todayHabits(today, overview.habits);
  if (habits.length === 0) return <>Hôm nay không có việc nào trong nhịp.</>;
  const left = habits.filter((habit) => !habit.checkedInToday).length;
  return (
    <>
      {habits.length} việc trong nhịp hôm nay ·{" "}
      {left > 0 ? `còn ${left} việc chờ ghi dấu.` : "đã ghi dấu hết."}
    </>
  );
}

async function Rhythm({ load }: { load: Load }) {
  const [today, overview] = await load;
  return <TodayRhythm today={today} overview={overview} />;
}

async function TimeZoneNotice() {
  // getCurrentUser() đã được layout gọi trong cùng request (React cache).
  const user = await getCurrentUser();
  return (
    <TimeZoneMismatchNotice userId={user.id} accountTimeZone={user.timeZone} />
  );
}

/** Hai bản chụp phải cùng một ngày; qua nửa đêm giữa hai lần đọc thì đọc lại. */
async function loadDay(): Load {
  const first = await Promise.all([getToday(), getHabitOverview()]);
  if (first[0].date === first[1].date) return first;
  return Promise.all([getToday(), getHabitOverview()]);
}

export default async function TodayPage() {
  const user = await getCurrentUser();
  // Lịch hôm nay (thứ tự theo Nếp) và tổng quan (vòng, 7 ngày, chuỗi) tải
  // song song; dùng chung một promise cho câu tóm tắt lẫn danh sách.
  const load: Load = loadDay();
  const now = new Date();
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timeZone,
  }).format(now);

  return (
    <section
      className="flex max-w-3xl flex-col gap-10"
      aria-labelledby="today-heading"
    >
      <header className="flex flex-col gap-3.5">
        <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          {formatTodayLabel(todayDate)}
        </p>
        <h1
          id="today-heading"
          className="font-display text-5xl leading-[1.02] font-normal tracking-[-0.025em] text-balance sm:text-[64px]"
        >
          {greetingAt(now, user.timeZone)}
          <br />
          <span className="text-primary italic">Hôm nay rèn điều gì?</span>
        </h1>
        <p className="text-base text-muted-foreground sm:text-[17px]">
          <Suspense fallback={<TodaySummarySkeleton />}>
            <Summary load={load} />
          </Suspense>
        </p>
      </header>

      <Suspense fallback={null}>
        <TimeZoneNotice />
      </Suspense>

      <Suspense fallback={<TodayRhythmSkeleton />}>
        <Rhythm load={load} />
      </Suspense>
    </section>
  );
}
