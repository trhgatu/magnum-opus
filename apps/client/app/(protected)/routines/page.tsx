import { ListChecks, Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getRoutines } from "@/features/routine/api/routine";
import { RoutineCard } from "@/features/routine/components/routine-card";
import { RoutineCollectionControls } from "@/features/routine/components/routine-collection-controls";
import { RoutinePagination } from "@/features/routine/components/routine-pagination";
import { RoutineSearch } from "@/features/routine/components/routine-search";
import { parseRoutineLocation } from "@/features/routine/lib/routine-url";

export const metadata: Metadata = {
  title: "Trình tự",
  robots: { index: false, follow: false },
};

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseRoutineLocation(await searchParams);
  const result = await getRoutines({ ...location, limit: 20 });
  const archived = location.status === "ARCHIVED";

  return (
    <section className="flex flex-col gap-7" aria-labelledby="routines-heading">
      <ContextHero
        id="routines-heading"
        icon={ListChecks}
        eyebrow="Forge · Trình tự"
        title="Trình tự"
        description="Xếp những Thói quen riêng lẻ thành một nghi thức có điểm bắt đầu, nhịp chuyển tiếp và khoảnh khắc hoàn thành rõ ràng."
        meta={
          <>
            <Badge variant="outline">{result.meta.totalItems} Trình tự</Badge>
            <Badge variant="secondary">
              {archived ? "Kho lưu trữ" : "Đang rèn luyện"}
            </Badge>
          </>
        }
        actions={
          <Link href="/routines/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo Trình tự
          </Link>
        }
      />
      <section
        aria-label="Tìm kiếm và sắp xếp Trình tự"
        className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Bàn điều phối
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <RoutineSearch location={location} />
          <RoutineCollectionControls location={location} />
        </div>
      </section>
      {result.data.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {archived ? "Những trình tự đã dừng" : "Những trình tự đang rèn"}
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((routine, index) => (
              <RoutineCard key={routine.id} routine={routine} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            location.search
              ? "Không tìm thấy Trình tự"
              : archived
                ? "Kho lưu trữ đang trống"
                : "Chưa có Trình tự nào"
          }
          description={
            location.search
              ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
              : archived
                ? "Các Trình tự đã dừng sẽ xuất hiện tại đây."
                : "Bắt đầu bằng cách gom những thói quen thường đi cùng nhau."
          }
          action={
            location.search || archived ? (
              <Link
                href="/routines"
                className={buttonVariants({ variant: "outline" })}
              >
                Về Trình tự đang hoạt động
              </Link>
            ) : undefined
          }
        />
      )}
      <RoutinePagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </section>
  );
}
