import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { getRoutines } from "@/features/routine/api/routine";
import { RoutineCard } from "@/features/routine/components/routine-card";
import { RoutineCollectionControls } from "@/features/routine/components/routine-collection-controls";
import { RoutinePagination } from "@/features/routine/components/routine-pagination";
import { RoutineSearch } from "@/features/routine/components/routine-search";
import { parseRoutineLocation } from "@/features/routine/lib/routine-url";

export const metadata: Metadata = {
  title: "Routines",
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
    <section className="flex flex-col gap-8" aria-labelledby="routines-heading">
      <PageHeading
        id="routines-heading"
        eyebrow="Forge"
        title="Routines"
        description="Kết nối nhiều thói quen thành một trình tự có thể bắt đầu và hoàn thành."
        actions={
          <Link href="/routines/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo Routine
          </Link>
        }
      />
      <div className="rounded-2xl border bg-card/35 p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <RoutineSearch location={location} />
          <RoutineCollectionControls location={location} />
        </div>
      </div>
      {result.data.length ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.meta.totalItems} Routine
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            location.search
              ? "Không tìm thấy Routine"
              : archived
                ? "Kho lưu trữ đang trống"
                : "Chưa có Routine nào"
          }
          description={
            location.search
              ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
              : archived
                ? "Các Routine đã dừng sẽ xuất hiện tại đây."
                : "Bắt đầu bằng cách gom những thói quen thường đi cùng nhau."
          }
          action={
            location.search || archived ? (
              <Link
                href="/routines"
                className={buttonVariants({ variant: "outline" })}
              >
                Về Routine đang hoạt động
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
