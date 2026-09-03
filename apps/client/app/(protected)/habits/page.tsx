import { Plus, Repeat2, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getHabits } from "@/features/habit/api/habit";
import { HabitCard } from "@/features/habit/components/habit-card";
import { HabitCollectionControls } from "@/features/habit/components/habit-collection-controls";
import { HabitPagination } from "@/features/habit/components/habit-pagination";
import { HabitSearch } from "@/features/habit/components/habit-search";
import {
  HabitListSkeleton,
  HabitMetaSkeleton,
} from "@/features/habit/components/habit-skeletons";
import { parseHabitLocation } from "@/features/habit/lib/habit-url";

export const metadata: Metadata = {
  title: "Thói quen",
  robots: { index: false, follow: false },
};

async function HabitsMeta({
  habitsPromise,
  archived,
}: {
  habitsPromise: ReturnType<typeof getHabits>;
  archived: boolean;
}) {
  const result = await habitsPromise;
  return (
    <>
      <Badge variant="outline">{result.meta.totalItems} Thói quen</Badge>
      <Badge variant="secondary">
        {archived ? "Kho lưu trữ" : "Đang rèn luyện"}
      </Badge>
    </>
  );
}

async function HabitsList({
  habitsPromise,
  location,
  archived,
}: {
  habitsPromise: ReturnType<typeof getHabits>;
  location: ReturnType<typeof parseHabitLocation>;
  archived: boolean;
}) {
  const result = await habitsPromise;

  return (
    <>
      {result.data.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {archived ? "Những nhịp đã dừng" : "Những nhịp đang rèn"}
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((habit, index) => (
              <HabitCard key={habit.id} habit={habit} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            location.search
              ? "Không tìm thấy thói quen"
              : archived
                ? "Kho lưu trữ đang trống"
                : "Chưa có thói quen nào"
          }
          description={
            location.search
              ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
              : archived
                ? "Các thói quen đã dừng sẽ xuất hiện ở đây."
                : "Bắt đầu bằng một hành động đủ nhỏ để lặp lại vào ngày mai."
          }
          action={
            location.search || archived ? (
              <Link
                href="/habits"
                className={buttonVariants({ variant: "outline" })}
              >
                Về thói quen đang rèn luyện
              </Link>
            ) : undefined
          }
        />
      )}
      <HabitPagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </>
  );
}

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseHabitLocation(await searchParams);
  const archived = location.status === "ARCHIVED";
  // Một promise dùng chung cho cả badge tổng số lẫn danh sách — apiFetch
  // không dedupe theo URL (x-correlation-id random mỗi lần), nên gọi lại
  // getHabits() ở hai nơi sẽ tốn 2 round-trip thật thay vì được cache lại.
  const habitsPromise = getHabits({ ...location, limit: 20 });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="habits-heading">
      <ContextHero
        id="habits-heading"
        icon={Repeat2}
        eyebrow="Forge · Thói quen"
        title="Thói quen"
        description="Rèn một hành động đủ nhỏ để lặp lại, rồi để dấu vết của từng ngày biến nó thành một phần của đời sống."
        meta={
          <Suspense fallback={<HabitMetaSkeleton />}>
            <HabitsMeta habitsPromise={habitsPromise} archived={archived} />
          </Suspense>
        }
        actions={
          <Link href="/habits/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo thói quen
          </Link>
        }
      />
      <section
        aria-label="Tìm kiếm và sắp xếp Thói quen"
        className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Bàn điều phối
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <HabitSearch location={location} />
          <HabitCollectionControls location={location} />
        </div>
      </section>
      <Suspense fallback={<HabitListSkeleton />}>
        <HabitsList
          habitsPromise={habitsPromise}
          location={location}
          archived={archived}
        />
      </Suspense>
    </section>
  );
}
