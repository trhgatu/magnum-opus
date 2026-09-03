import { ListChecks, Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getRoutines } from "@/features/routine/api/routine";
import { RoutineCard } from "@/features/routine/components/routine-card";
import { RoutineCollectionControls } from "@/features/routine/components/routine-collection-controls";
import { RoutinePagination } from "@/features/routine/components/routine-pagination";
import { RoutineSearch } from "@/features/routine/components/routine-search";
import {
  RoutineListSkeleton,
  RoutineMetaSkeleton,
} from "@/features/routine/components/routine-skeletons";
import { parseRoutineLocation } from "@/features/routine/lib/routine-url";

export const metadata: Metadata = {
  title: "Nếp sinh hoạt",
  robots: { index: false, follow: false },
};

async function RoutinesMeta({
  routinesPromise,
  archived,
}: {
  routinesPromise: ReturnType<typeof getRoutines>;
  archived: boolean;
}) {
  const result = await routinesPromise;
  return (
    <>
      <Badge variant="outline">{result.meta.totalItems} Nếp sinh hoạt</Badge>
      <Badge variant="secondary">
        {archived ? "Kho lưu trữ" : "Đang rèn luyện"}
      </Badge>
    </>
  );
}

async function RoutinesList({
  routinesPromise,
  location,
  archived,
}: {
  routinesPromise: ReturnType<typeof getRoutines>;
  location: ReturnType<typeof parseRoutineLocation>;
  archived: boolean;
}) {
  const result = await routinesPromise;

  return (
    <>
      {result.data.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {archived
                ? "Những Nếp sinh hoạt đã dừng"
                : "Những Nếp sinh hoạt đang rèn"}
              <span className="sr-only">
                {" "}
                — {result.meta.totalItems} kết quả
              </span>
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
              ? "Không tìm thấy Nếp sinh hoạt"
              : archived
                ? "Kho lưu trữ đang trống"
                : "Chưa có Nếp sinh hoạt nào"
          }
          description={
            location.search
              ? "Thử từ khóa khác hoặc xóa bộ lọc hiện tại."
              : archived
                ? "Các Nếp sinh hoạt đã dừng sẽ xuất hiện tại đây."
                : "Bắt đầu bằng cách gom những thói quen thường đi cùng nhau."
          }
          action={
            location.search || archived ? (
              <Link
                href="/routines"
                className={buttonVariants({ variant: "outline" })}
              >
                Về Nếp sinh hoạt đang hoạt động
              </Link>
            ) : undefined
          }
        />
      )}
      <RoutinePagination
        location={location}
        totalPages={result.meta.totalPages}
      />
    </>
  );
}

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const location = parseRoutineLocation(await searchParams);
  const archived = location.status === "ARCHIVED";
  // Một promise dùng chung cho cả badge tổng số lẫn danh sách — apiFetch
  // không dedupe theo URL (x-correlation-id random mỗi lần), nên gọi lại
  // getRoutines() ở hai nơi sẽ tốn 2 round-trip thật thay vì được cache lại.
  const routinesPromise = getRoutines({ ...location, limit: 20 });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="routines-heading">
      <ContextHero
        id="routines-heading"
        icon={ListChecks}
        eyebrow="Forge · Nếp sinh hoạt"
        title="Nếp sinh hoạt"
        description="Xếp những Thói quen riêng lẻ thành một nghi thức có điểm bắt đầu, nhịp chuyển tiếp và khoảnh khắc hoàn thành rõ ràng."
        meta={
          <Suspense fallback={<RoutineMetaSkeleton />}>
            <RoutinesMeta
              routinesPromise={routinesPromise}
              archived={archived}
            />
          </Suspense>
        }
        actions={
          <Link href="/routines/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" /> Tạo Nếp sinh hoạt
          </Link>
        }
      />
      <section
        aria-label="Tìm kiếm và sắp xếp Nếp sinh hoạt"
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
      <Suspense fallback={<RoutineListSkeleton />}>
        <RoutinesList
          routinesPromise={routinesPromise}
          location={location}
          archived={archived}
        />
      </Suspense>
    </section>
  );
}
