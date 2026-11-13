import type { HabitOverviewResponse, HabitType } from "@repo/contracts";
import { Archive, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
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
import { HabitTrashListLazy } from "@/features/habit/components/habit-trash-list-lazy";
import {
  HabitListSkeleton,
  HabitSummarySkeleton,
} from "@/features/habit/components/habit-skeletons";
import {
  filterHabitOverview,
  habitOverviewGroupOf,
} from "@/features/habit/lib/habit-overview";
import {
  buildHabitHref,
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
    (habit) => habitOverviewGroupOf(habit) === "pending",
  ).length;
  const quitting = habits.filter((habit) => habit.type === "QUIT").length;

  return (
    <>
      {habits.length - quitting} xây dựng · {quitting} từ bỏ ·{" "}
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
      description={
        location.status === "ARCHIVED"
          ? `Không có thói quen lưu trữ nào tên chứa “${location.search}”.`
          : location.status === "TRASHED"
            ? `Thùng rác không có thói quen nào tên chứa “${location.search}”.`
            : `Không có thói quen ${TAB_LABELS[location.type].toLowerCase()} nào tên chứa “${location.search}”.`
      }
      action={
        <Link
          href={buildHabitHref({
            status: location.status,
            type: location.type,
          })}
          className={buttonVariants({ variant: "outline" })}
        >
          Xóa từ khóa
        </Link>
      }
    />
  );
}

const TAB_LABELS: Record<HabitType, string> = {
  BUILD: "Xây dựng",
  QUIT: "Từ bỏ",
};

const ofType = (habits: HabitOverviewResponse["habits"], type: HabitType) =>
  habits.filter((habit) => habit.type === type);

/** Tìm kiếm áp cho cả hai loại: kết quả ở tab kia thì chỉ đường sang. */
function OtherTabHint({
  location,
  count,
}: {
  location: Location;
  count: number;
}) {
  const other: HabitType = location.type === "QUIT" ? "BUILD" : "QUIT";
  return (
    <Link
      href={buildHabitHref({ type: other, search: location.search })}
      className="inline-flex items-center gap-1.5 self-start rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Có {count} kết quả ở {TAB_LABELS[other]}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
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
  const found = filterHabitOverview(overview.habits, location.search);
  const habits = ofType(found, location.type);
  const elsewhere = found.length - habits.length;

  if (habits.length === 0) {
    if (location.search) {
      return (
        <div className="flex flex-col gap-4">
          <SearchEmptyState location={location} />
          {elsewhere > 0 ? (
            <OtherTabHint location={location} count={elsewhere} />
          ) : null}
        </div>
      );
    }
    return location.type === "QUIT" ? (
      <EmptyState
        title="Chưa có thói quen từ bỏ nào"
        description="Khi muốn bỏ một điều gì đó, tạo thói quen loại Từ bỏ để đếm từng ngày giữ được."
      />
    ) : (
      <EmptyState
        title="Chưa có thói quen nào"
        description="Bắt đầu bằng một hành động đủ nhỏ để lặp lại vào ngày mai."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {location.search && elsewhere > 0 ? (
        <OtherTabHint location={location} count={elsewhere} />
      ) : null}
      <HabitOverviewList
        overview={overview}
        habits={habits}
        type={location.type}
        searching={location.search !== ""}
      />
    </div>
  );
}

/** Số trên tab đổi theo từ khóa đang tìm. */
async function TabCount({
  overviewPromise,
  location,
  type,
}: {
  overviewPromise: ReturnType<typeof getHabitOverview>;
  location: Location;
  type: HabitType;
}) {
  const { habits } = await overviewPromise;
  return (
    <span className="font-mono text-xs tabular-nums opacity-80">
      {ofType(filterHabitOverview(habits, location.search), type).length}
    </span>
  );
}

async function ListedHabits({ location }: { location: Location }) {
  const result = await getHabits({ ...location, limit: 20 });
  const trashed = location.status === "TRASHED";

  if (result.data.length === 0) {
    // Trang vượt quá cuối (vd vừa khôi phục hết trang cuối): cho đường về.
    if (location.page > 1) {
      return (
        <EmptyState
          title="Trang này không còn thói quen"
          description={
            trashed
              ? "Các thói quen trong Thùng rác đã nằm ở những trang trước."
              : "Các thói quen lưu trữ đã nằm ở những trang trước."
          }
          action={
            <Link
              href={buildHabitHref({
                status: location.status,
                search: location.search,
              })}
              className={buttonVariants({ variant: "outline" })}
            >
              Về trang đầu
            </Link>
          }
        />
      );
    }
    return location.search ? (
      <SearchEmptyState location={location} />
    ) : trashed ? (
      <EmptyState
        title="Thùng rác đang trống"
        description="Thói quen tạo nhầm hay không muốn giữ nữa sẽ nằm ở đây cho tới khi bạn xóa hẳn."
      />
    ) : (
      <EmptyState
        title="Kho lưu trữ đang trống"
        description="Thói quen đã dừng sẽ nằm ở đây, cùng toàn bộ dấu vết của chúng."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {trashed ? (
        <HabitTrashListLazy habits={result.data} />
      ) : (
        <HabitArchivedList habits={result.data} />
      )}
      <HabitPagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </div>
  );
}

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseHabitLocation(await searchParams);
  // Đã lưu trữ và Thùng rác là danh sách phân trang, không chia tab.
  const listed = location.status !== "ACTIVE";
  // Một promise cho cả câu tóm tắt lẫn danh sách: apiFetch không dedupe
  // theo URL, gọi hai lần là hai round-trip thật.
  const overviewPromise = listed ? null : getHabitOverview();

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
            ) : location.status === "TRASHED" ? (
              "Thói quen chờ xóa hẳn. Khôi phục thì mọi dấu vết còn nguyên."
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
        {listed ? (
          <Link
            href={buildHabitHref({ search: location.search })}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Thói quen đang
            rèn
          </Link>
        ) : (
          <nav aria-label="Loại thói quen" className="flex gap-1.5">
            {(["BUILD", "QUIT"] as const).map((type) => (
              <Link
                key={type}
                href={buildHabitHref({ type, search: location.search })}
                aria-current={location.type === type ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  location.type === type
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {TAB_LABELS[type]}
                {overviewPromise ? (
                  <Suspense fallback={null}>
                    <TabCount
                      overviewPromise={overviewPromise}
                      location={location}
                      type={type}
                    />
                  </Suspense>
                ) : null}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {/* Ô nhập không kiểm soát: dựng lại khi URL đổi để khớp từ khóa. */}
          <HabitSearch
            key={`${location.status}:${location.type}:${location.search}`}
            location={location}
          />
          {listed ? null : (
            <>
              <Link
                href={buildHabitHref({
                  status: "ARCHIVED",
                  search: location.search,
                })}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Archive className="size-4" aria-hidden="true" /> Đã lưu trữ
              </Link>
              <Link
                href={buildHabitHref({
                  status: "TRASHED",
                  search: location.search,
                })}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" aria-hidden="true" /> Thùng rác
              </Link>
            </>
          )}
        </div>
      </div>

      <Suspense
        key={`${location.status}:${location.type}:${location.search}:${location.page}`}
        fallback={<HabitListSkeleton />}
      >
        {overviewPromise ? (
          <ActiveHabits overviewPromise={overviewPromise} location={location} />
        ) : (
          <ListedHabits location={location} />
        )}
      </Suspense>
    </section>
  );
}
