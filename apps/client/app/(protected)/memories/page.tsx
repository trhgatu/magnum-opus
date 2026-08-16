import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { getMemories } from "@/features/memory/api/memory";
import { MemoryCard } from "@/features/memory/components/memory-card";
import { MemoryCollectionControls } from "@/features/memory/components/memory-collection-controls";
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

export default async function MemoriesPage({
  searchParams,
}: MemoriesPageProps) {
  const location = parseMemoryLocation(await searchParams);

  const result = await getMemories({
    page: location.page,
    limit: 20,
    search: location.search,
    state: location.state,
    sortBy: location.sortBy,
    sortOrder: location.sortOrder,
  });

  const isTrash = location.state === "TRASHED";

  const hasCustomView =
    Boolean(location.search) ||
    isTrash ||
    location.sortBy !== DEFAULT_MEMORY_SORT_FIELD ||
    location.sortOrder !== DEFAULT_MEMORY_SORT_ORDER;

  const emptyTitle = location.search
    ? "Không tìm thấy ký ức"
    : isTrash
      ? "Trash đang trống"
      : "Chưa có ký ức nào";

  const emptyDescription = location.search
    ? "Thử một từ khóa khác hoặc xóa các điều kiện tìm kiếm hiện tại."
    : isTrash
      ? "Những ký ức được đưa vào Trash sẽ xuất hiện tại đây."
      : "Những khoảnh khắc được lựa chọn để lưu giữ sẽ xuất hiện theo dòng thời gian.";

  return (
    <section className="flex flex-col gap-8" aria-labelledby="memories-heading">
      <PageHeading
        id="memories-heading"
        eyebrow="Reflection"
        title="Ký ức"
        description="Những khoảnh khắc đã thực sự được sống, được giữ lại theo thời điểm chúng xảy ra."
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

      <div className="space-y-4">
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

      {result.data.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.meta.totalItems} ký ức
            {location.search
              ? " phù hợp"
              : isTrash
                ? " trong Trash"
                : " đang được lưu giữ"}
          </p>

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
    </section>
  );
}
