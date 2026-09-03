import { Archive, Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { EmptyState } from "@/components/system/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getMemories } from "@/features/memory/api/memory";
import { MemoryCard } from "@/features/memory/components/memory-card";
import { MemoryCollectionControls } from "@/features/memory/components/memory-collection-controls";
import {
  MemoryListSkeleton,
  MemoryMetaSkeleton,
} from "@/features/memory/components/memory-skeletons";
import { MemoryPagination } from "@/features/memory/components/memory-pagination";
import { MemorySearch } from "@/features/memory/components/memory-search";
import {
  DEFAULT_MEMORY_SORT_FIELD,
  DEFAULT_MEMORY_SORT_ORDER,
  parseMemoryLocation,
} from "@/features/memory/lib/memory-url";

export const metadata: Metadata = {
  title: "Ký ức",
  robots: {
    index: false,
    follow: false,
  },
};

interface MemoriesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function MemoriesMeta({
  memoriesPromise,
  isTrash,
}: {
  memoriesPromise: ReturnType<typeof getMemories>;
  isTrash: boolean;
}) {
  const result = await memoriesPromise;
  return (
    <>
      <Badge variant="outline">{result.meta.totalItems} ký ức</Badge>
      <Badge variant="secondary">
        {isTrash ? "Thùng rác" : "Đang lưu giữ"}
      </Badge>
    </>
  );
}

async function MemoriesList({
  memoriesPromise,
  location,
  isTrash,
  hasCustomView,
}: {
  memoriesPromise: ReturnType<typeof getMemories>;
  location: ReturnType<typeof parseMemoryLocation>;
  isTrash: boolean;
  hasCustomView: boolean;
}) {
  const result = await memoriesPromise;

  const emptyTitle = location.search
    ? "Không tìm thấy ký ức"
    : isTrash
      ? "Thùng rác đang trống"
      : "Chưa có ký ức nào";

  const emptyDescription = location.search
    ? "Thử một từ khóa khác hoặc xóa các điều kiện tìm kiếm hiện tại."
    : isTrash
      ? "Những ký ức được đưa vào Thùng rác sẽ xuất hiện tại đây."
      : "Những khoảnh khắc được lựa chọn để lưu giữ sẽ xuất hiện theo dòng thời gian.";

  return (
    <>
      {result.data.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {location.search
                ? "Những ký ức phù hợp"
                : isTrash
                  ? "Những ký ức trong Thùng rác"
                  : "Những ký ức đang lưu giữ"}
              <span className="sr-only">
                {" "}
                — {result.meta.totalItems} kết quả
              </span>
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.data.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            hasCustomView ? (
              <Link
                href="/memories"
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                Trở về ký ức đang lưu giữ
              </Link>
            ) : undefined
          }
        />
      )}

      <MemoryPagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
        search={location.search}
        state={location.state}
        sortBy={location.sortBy}
        sortOrder={location.sortOrder}
      />
    </>
  );
}

export default async function MemoriesPage({
  searchParams,
}: MemoriesPageProps) {
  const location = parseMemoryLocation(await searchParams);

  const isTrash = location.state === "TRASHED";

  const hasCustomView =
    Boolean(location.search) ||
    isTrash ||
    location.sortBy !== DEFAULT_MEMORY_SORT_FIELD ||
    location.sortOrder !== DEFAULT_MEMORY_SORT_ORDER;

  // Một promise dùng chung cho cả badge tổng số lẫn danh sách — apiFetch
  // không dedupe theo URL (x-correlation-id random mỗi lần), nên gọi lại
  // getMemories() ở hai nơi sẽ tốn 2 round-trip thật thay vì được cache lại.
  const memoriesPromise = getMemories({
    page: location.page,
    limit: 20,
    search: location.search,
    state: location.state,
    sortBy: location.sortBy,
    sortOrder: location.sortOrder,
  });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="memories-heading">
      <ContextHero
        id="memories-heading"
        icon={Archive}
        eyebrow="Reflection · Archive"
        title="Ký ức"
        description="Những khoảnh khắc đã thực sự được sống, nguyên vẹn như ngày đầu tiên."
        meta={
          <Suspense fallback={<MemoryMetaSkeleton />}>
            <MemoriesMeta memoriesPromise={memoriesPromise} isTrash={isTrash} />
          </Suspense>
        }
        actions={
          <Link
            href="/memories/new"
            className={buttonVariants({
              size: "lg",
            })}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Lưu một ký ức
          </Link>
        }
      />

      <section
        aria-label="Tìm kiếm và sắp xếp ký ức"
        className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Tủ lưu trữ
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <MemorySearch
            search={location.search}
            state={location.state}
            sortBy={location.sortBy}
            sortOrder={location.sortOrder}
          />

          <MemoryCollectionControls
            search={location.search}
            state={location.state}
            sortBy={location.sortBy}
            sortOrder={location.sortOrder}
          />
        </div>
      </section>

      <Suspense fallback={<MemoryListSkeleton />}>
        <MemoriesList
          memoriesPromise={memoriesPromise}
          location={location}
          isTrash={isTrash}
          hasCustomView={hasCustomView}
        />
      </Suspense>
    </section>
  );
}
