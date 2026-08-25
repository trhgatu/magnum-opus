import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { getHabits } from "@/features/habit/api/habit";
import { HabitCard } from "@/features/habit/components/habit-card";
import { HabitCollectionControls } from "@/features/habit/components/habit-collection-controls";
import { HabitPagination } from "@/features/habit/components/habit-pagination";
import { HabitSearch } from "@/features/habit/components/habit-search";
import { parseHabitLocation } from "@/features/habit/lib/habit-url";

export const metadata: Metadata = {
  title: "Habits",
  robots: { index: false, follow: false },
};

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseHabitLocation(await searchParams);
  const result = await getHabits({ ...location, limit: 20 });
  const archived = location.status === "ARCHIVED";
  return (
    <section className="flex flex-col gap-8" aria-labelledby="habits-heading">
      <PageHeading
        id="habits-heading"
        eyebrow="Forge"
        title="Habits"
        description="Những nhịp lặp nhỏ được rèn thành một đời sống có chủ ý."
        actions={
          <Link href="/habits/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo thói quen
          </Link>
        }
      />
      <div className="rounded-2xl border bg-card/35 p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <HabitSearch location={location} />
          <HabitCollectionControls location={location} />
        </div>
      </div>
      {result.data.length ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.meta.totalItems} thói quen
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
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
    </section>
  );
}
