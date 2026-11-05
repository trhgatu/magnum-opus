import type { Metadata } from "next";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/account/api/current-user";
import { TimeZoneMismatchNotice } from "@/features/account/components/time-zone-mismatch-notice";
import { getHabitOverview } from "@/features/habit/api/habit";
import { getJournalEntries } from "@/features/journal/api/journal";
import { getMemories } from "@/features/memory/api/memory";
import { getFocusProject } from "@/features/project/api/project";
import { getProjectActivity } from "@/features/project-activity/api/project-activity";
import { getToday } from "@/features/today/api/today";
import { TodayCrucible } from "@/features/today/components/today-crucible";
import { TodayHolding } from "@/features/today/components/today-holding";
import { TodayReflection } from "@/features/today/components/today-reflection";
import { TodayRhythm } from "@/features/today/components/today-rhythm";
import {
  TodayCardSkeleton,
  TodayRhythmSkeleton,
  TodaySummarySkeleton,
} from "@/features/today/components/today-skeletons";
import { journalEntryToday } from "@/features/today/lib/today-focus";
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

async function Holding({ load }: { load: Load }) {
  const [, overview] = await load;
  return <TodayHolding habits={overview.habits} />;
}

async function Rhythm({ load }: { load: Load }) {
  const [today, overview] = await load;
  return <TodayRhythm today={today} overview={overview} />;
}

/** Một thẻ không tải được thì chỉ thẻ đó báo, trang Hôm nay vẫn dùng được. */
function CardUnavailable({ title }: { title: string }) {
  return (
    <section className="flex h-full flex-col gap-2 rounded-3xl border border-dashed px-6 py-6">
      <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {title}
      </p>
      <p className="text-sm text-muted-foreground">
        Chưa tải được phần này. Tải lại trang để thử lại.
      </p>
    </section>
  );
}

async function Crucible({
  today,
  timeZone,
}: {
  today: string;
  timeZone: string;
}) {
  // Server chọn Project đang luyện: hoạt động gần nhất, rồi Cycle mới nhất.
  const focus = await getFocusProject().catch(() => null);
  if (!focus) return <CardUnavailable title="Crucible" />;
  const { project } = focus;
  return (
    <TodayCrucible
      project={project}
      activityPromise={project ? getProjectActivity(project.id) : null}
      today={today}
      timeZone={timeZone}
    />
  );
}

async function Reflection({
  today,
  timeZone,
}: {
  today: string;
  timeZone: string;
}) {
  const loaded = await Promise.all([
    getJournalEntries({ limit: 1, sortBy: "createdAt" }),
    getMemories({ limit: 1, sortBy: "createdAt", sortOrder: "desc" }),
  ]).catch(() => null);
  if (!loaded) return <CardUnavailable title="Reflection" />;
  const [entries, memories] = loaded;
  return (
    <TodayReflection
      entryToday={journalEntryToday(entries.data[0], today, timeZone)}
      latestMemory={memories.data[0] ?? null}
      today={today}
      timeZone={timeZone}
    />
  );
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
    <section className="flex flex-col gap-10" aria-labelledby="today-heading">
      <header className="flex max-w-3xl flex-col gap-3.5">
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
        <Suspense fallback={null}>
          <Holding load={load} />
        </Suspense>
      </header>

      <Suspense fallback={null}>
        <TimeZoneNotice />
      </Suspense>

      {/* Hai thẻ ngắn đứng ngang, cao bằng nhau; mỗi thẻ tải riêng, Project
          hay Reflection chậm không giữ cả trang. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense
          fallback={<TodayCardSkeleton label="Đang tải Project đang luyện…" />}
        >
          <Crucible today={todayDate} timeZone={user.timeZone} />
        </Suspense>
        <Suspense
          fallback={<TodayCardSkeleton label="Đang tải trang hôm nay…" />}
        >
          <Reflection today={todayDate} timeZone={user.timeZone} />
        </Suspense>
      </div>

      <Suspense fallback={<TodayRhythmSkeleton />}>
        <Rhythm load={load} />
      </Suspense>
    </section>
  );
}
