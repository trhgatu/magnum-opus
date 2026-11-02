import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/system/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getHabitOverview, getHabits } from "@/features/habit/api/habit";
import { HabitArchivedList } from "@/features/habit/components/habit-archived-list";
import { HabitOverviewList } from "@/features/habit/components/habit-overview-list";
import { HabitPagination } from "@/features/habit/components/habit-pagination";
import { HabitSearch } from "@/features/habit/components/habit-search";
import {
  HabitListSkeleton,
  HabitSummarySkeleton,
} from "@/features/habit/components/habit-skeletons";
import { filterHabitOverview } from "@/features/habit/lib/habit-overview";
import {
  buildHabitHref,
  type HabitStatus,
  parseHabitLocation,
} from "@/features/habit/lib/habit-url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Thói quen",
  robots: { index: false, follow: false },
};

type Location = ReturnType<typeof parseHabitLocation>;

async function ActiveSummary({
  overviewPromise,
}: {
  overviewPromise: ReturnType<typeof getHabitOverview>;
}) {
  const { habits } = await overviewPromise;
  if (habits.length === 0) return <>Chưa có thói quen nào đang rèn.</>;

  const waiting = habits.filter(
    (habit) =>
      habit.type === "BUILD" && habit.dueToday && !habit.checkedInToday,
  ).length;

  return (
    <>
      {habits.length} thói quen đang rèn ·{" "}
      {waiting > 0
        ? `hôm nay còn ${waiting} việc chờ ghi dấu.`
        : "hôm nay không còn việc nào chờ."}
    </>
  );
}

function SearchEmptyState({ location }: { location: Location }) {
  return (
    <EmptyState
      title="Không tìm thấy thói quen"
      description={`Không có thói quen nào tên chứa “${location.search}”.`}
      action={
        <Link
          href={buildHabitHref({ status: location.status })}
          className={buttonVariants({ variant: "outline" })}
        >
          Xóa từ khóa
        </Link>
      }
    />
  );
}

async function ActiveHabits({
  overviewPromise,
  location,
}: {
  overviewPromise: ReturnType<typeof getHabitOverview>;
  location: Location;
}) {
  const overview = await overviewPromise;

  if (overview.habits.length === 0) {
    return (
      <EmptyState
        title="Chưa có thói quen nào"
        description="Bắt đầu bằng một hành động đủ nhỏ để lặp lại vào ngày mai."
      />
    );
  }

  const habits = filterHabitOverview(overview.habits, location.search);
  if (habits.length === 0) return <SearchEmptyState location={location} />;

  return <HabitOverviewList overview={overview} habits={habits} />;
}

async function ArchivedHabits({ location }: { location: Location }) {
  const result = await getHabits({ ...location, limit: 20 });

  if (result.data.length === 0) {
    return location.search ? (
      <SearchEmptyState location={location} />
    ) : (
      <EmptyState
        title="Kho lưu trữ đang trống"
        description="Thói quen đã dừng sẽ nằm ở đây, cùng toàn bộ dấu vết của chúng."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HabitArchivedList habits={result.data} />
      <HabitPagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </div>
  );
}

const TABS: Array<{ status: HabitStatus; label: string }> = [
  { status: "ACTIVE", label: "Đang rèn" },
  { status: "ARCHIVED", label: "Đã lưu trữ" },
];

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseHabitLocation(await searchParams);
  const archived = location.status === "ARCHIVED";
  // Một promise cho cả câu tóm tắt lẫn danh sách: apiFetch không dedupe
  // theo URL, gọi hai lần là hai round-trip thật.
  const overviewPromise = archived ? null : getHabitOverview();

  return (
    <section className="flex flex-col gap-8" aria-labelledby="habits-heading">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Forge
          </p>
          <h1
            id="habits-heading"
            className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] sm:text-[46px]"
          >
            Thói quen
          </h1>
          <p className="text-base text-muted-foreground sm:text-[17px]">
            {overviewPromise ? (
              <Suspense fallback={<HabitSummarySkeleton />}>
                <ActiveSummary overviewPromise={overviewPromise} />
              </Suspense>
            ) : (
              "Những thói quen đã dừng, giữ lại cùng dấu vết của chúng."
            )}
          </p>
        </div>
        <Link href="/habits/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden="true" /> Tạo thói quen
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Trạng thái thói quen" className="flex gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.status}
              href={buildHabitHref({ status: tab.status })}
              aria-current={location.status === tab.status ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-xl px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                location.status === tab.status
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <HabitSearch location={location} />
      </div>

      <Suspense
        key={`${location.status}:${location.search}:${location.page}`}
        fallback={<HabitListSkeleton />}
      >
        {overviewPromise ? (
          <ActiveHabits overviewPromise={overviewPromise} location={location} />
        ) : (
          <ArchivedHabits location={location} />
        )}
      </Suspense>
    </section>
  );
}
