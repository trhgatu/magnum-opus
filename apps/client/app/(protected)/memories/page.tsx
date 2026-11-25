import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/system/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getMemories } from "@/features/memory/api/memory";
import { MemoryCollectionControls } from "@/features/memory/components/memory-collection-controls";
import { MemoryCard } from "@/features/memory/components/memory-card";
import {
  MemoryListSkeleton,
  MemoryMetaSkeleton,
} from "@/features/memory/components/memory-skeletons";
import { MemoryPagination } from "@/features/memory/components/memory-pagination";
import { MemorySearch } from "@/features/memory/components/memory-search";
import { groupMemoriesByYear } from "@/features/memory/lib/memory-groups";
import {
  buildMemoryHref,
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

type Location = ReturnType<typeof parseMemoryLocation>;
type MemoriesPromise = ReturnType<typeof getMemories>;

const QUIET_LINK =
  "inline-flex h-10 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

async function MemoriesSummary({
  memoriesPromise,
  isTrash,
}: {
  memoriesPromise: MemoriesPromise;
  isTrash: boolean;
}) {
  const result = await memoriesPromise.catch(() => null);
  if (!result) return null;
  const total = result.meta.totalItems;
  if (isTrash) {
    return total === 0
      ? "Thùng rác đang trống."
      : `${total} ký ức chờ xóa hẳn. Khôi phục thì còn nguyên.`;
  }
  return total === 0
    ? "Chưa có ký ức nào được lưu giữ."
    : `${total} ký ức đang được lưu giữ.`;
}

async function MemoriesList({
  memoriesPromise,
  location,
  isTrash,
  hasCustomView,
}: {
  memoriesPromise: MemoriesPromise;
  location: Location;
  isTrash: boolean;
  hasCustomView: boolean;
}) {
  const result = await memoriesPromise;

  if (result.data.length === 0) {
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
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          hasCustomView ? (
            <Link
              href="/memories"
              className={buttonVariants({ variant: "outline" })}
            >
              Trở về ký ức đang lưu giữ
            </Link>
          ) : undefined
        }
      />
    );
  }

  const groups = groupMemoriesByYear(result.data, location.sortBy);

  return (
    <div className="flex flex-col gap-6">
      <p aria-live="polite" className="sr-only">
        {result.meta.totalItems} kết quả
      </p>
      {groups.map((group) => (
        <section
          key={group.label ?? "all"}
          aria-labelledby={`memories-${group.label ?? "all"}`}
          className="flex flex-col gap-4"
        >
          <h2
            id={`memories-${group.label ?? "all"}`}
            className={
              group.label
                ? "font-display text-4xl font-normal tracking-[-0.02em] text-muted-foreground"
                : "sr-only"
            }
          >
            {group.label ?? "Danh sách ký ức"}
          </h2>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        </section>
      ))}

      <MemoryPagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
        search={location.search}
        state={location.state}
        sortBy={location.sortBy}
        sortOrder={location.sortOrder}
      />
    </div>
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

  // Một promise dùng chung cho cả câu tóm tắt lẫn danh sách — apiFetch
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
    <section className="flex flex-col gap-8" aria-labelledby="memories-heading">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-3xl flex-col gap-2.5">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Reflection
          </p>
          <h1
            id="memories-heading"
            className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] sm:text-[46px]"
          >
            {isTrash ? "Ký ức trong Thùng rác" : "Ký ức"}
          </h1>
          {/* div, không phải p: skeleton là <div>, nằm trong <p> thì HTML
              không hợp lệ, trình duyệt tách ra và hydrate lệch. */}
          <div className="text-base text-muted-foreground sm:text-[17px]">
            <Suspense fallback={<MemoryMetaSkeleton />}>
              <MemoriesSummary
                memoriesPromise={memoriesPromise}
                isTrash={isTrash}
              />
            </Suspense>
          </div>
        </div>
        <Link href="/memories/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden="true" /> Lưu một ký ức
        </Link>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full min-w-0 lg:max-w-sm">
            <MemorySearch
              search={location.search}
              state={location.state}
              sortBy={location.sortBy}
              sortOrder={location.sortOrder}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MemoryCollectionControls
              search={location.search}
              state={location.state}
              sortBy={location.sortBy}
              sortOrder={location.sortOrder}
            />
            {isTrash ? (
              <Link
                href={buildMemoryHref({
                  search: location.search,
                  sortBy: location.sortBy,
                  sortOrder: location.sortOrder,
                })}
                className={QUIET_LINK}
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Ký ức đang
                lưu giữ
              </Link>
            ) : (
              <Link
                href={buildMemoryHref({
                  search: location.search,
                  state: "TRASHED",
                  sortBy: location.sortBy,
                  sortOrder: location.sortOrder,
                })}
                className={QUIET_LINK}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Thùng rác
              </Link>
            )}
          </div>
        </div>

        <Suspense
          key={`${location.state}:${location.search}:${location.sortBy}:${location.sortOrder}:${location.page}`}
          fallback={<MemoryListSkeleton />}
        >
          <MemoriesList
            memoriesPromise={memoriesPromise}
            location={location}
            isTrash={isTrash}
            hasCustomView={hasCustomView}
          />
        </Suspense>
      </div>
    </section>
  );
}
