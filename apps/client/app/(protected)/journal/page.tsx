import type { JournalEntryState } from "@repo/contracts";
import { BookOpenText, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { ContextHero } from "@/components/system/context-hero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createJournalEntry } from "@/features/journal/actions/journal";
import { getJournalEntries } from "@/features/journal/api/journal";
import { CreateEntryButton } from "@/features/journal/components/create-entry-button";
import {
  JournalEntryCard,
  stateLabels,
} from "@/features/journal/components/journal-entry-card";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import { JournalSearch } from "@/features/journal/components/journal-search";
import { JournalStateFilter } from "@/features/journal/components/journal-state-filter";

export const metadata: Metadata = {
  title: "Nhật ký",
  robots: { index: false, follow: false },
};

interface JournalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const stateFrom = (value: string | string[] | undefined) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "DRAFT" ||
    candidate === "SEALED" ||
    candidate === "TRASHED"
    ? (candidate as JournalEntryState)
    : undefined;
};

const numberFrom = (value: string | string[] | undefined) => {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(candidate) && candidate > 0 ? candidate : 1;
};

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const page = numberFrom(params.page);
  const search = String(
    Array.isArray(params.search) ? params.search[0] : (params.search ?? ""),
  ).trim();
  const state = stateFrom(params.state);
  const result = await getJournalEntries({ page, limit: 20, search, state });
  const hasFilters = Boolean(search || state);
  const createFailed = Array.isArray(params.createFailed)
    ? params.createFailed[0] === "1"
    : params.createFailed === "1";

  return (
    <section className="flex flex-col gap-7" aria-labelledby="journal-heading">
      <ContextHero
        id="journal-heading"
        icon={BookOpenText}
        eyebrow="Reflection · Nhật ký"
        title="Nhật ký"
        description="Một căn phòng riêng để đặt xuống điều đang sống động — chưa cần hoàn hảo, chưa cần trở thành bất cứ điều gì khác."
        meta={
          <>
            <Badge variant="outline">{result.meta.totalItems} entry</Badge>
            <Badge variant="secondary">
              {state ? stateLabels[state] : "Đang lưu giữ"}
            </Badge>
          </>
        }
        actions={
          <form action={createJournalEntry}>
            <CreateEntryButton />
          </form>
        }
      />

      {createFailed ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Chưa thể tạo entry mới. Hãy thử lại sau một lát.
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Tìm kiếm và lọc Nhật ký"
        className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Mục lục riêng
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <JournalSearch initialSearch={search} state={state} />
          <JournalStateFilter search={search} state={state} />
        </div>
      </section>

      {result.data.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {hasFilters ? "Những trang phù hợp" : "Những trang đang lưu giữ"}
              <span className="sr-only">
                {" "}
                — {result.meta.totalItems} kết quả
              </span>
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.data.map((entry, index) => (
              <JournalEntryCard key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Chưa có entry phù hợp"
          description={
            search
              ? "Thử một từ khóa khác hoặc bỏ bộ lọc hiện tại."
              : state === "TRASHED"
                ? "Trash đang trống."
                : "Bắt đầu bằng một dòng đang hiện diện trong tâm trí."
          }
          action={
            hasFilters ? (
              <Link
                href="/journal"
                className={buttonVariants({ variant: "outline" })}
              >
                Xóa tìm kiếm và bộ lọc
              </Link>
            ) : undefined
          }
        />
      )}

      <JournalPagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
        search={search}
        state={state}
      />
    </section>
  );
}
