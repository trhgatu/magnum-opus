import type { JournalEntryState } from "@repo/contracts";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { createJournalEntry } from "@/features/journal/actions/journal";
import { getJournalEntries } from "@/features/journal/api/journal";
import { CreateEntryButton } from "@/features/journal/components/create-entry-button";
import { JournalEntryCard } from "@/features/journal/components/journal-entry-card";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import { JournalSearch } from "@/features/journal/components/journal-search";
import { JournalStateFilter } from "@/features/journal/components/journal-state-filter";

export const metadata: Metadata = {
  title: "Journal",
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
    <section className="flex flex-col gap-8" aria-labelledby="journal-heading">
      <PageHeading
        id="journal-heading"
        eyebrow="Reflection"
        title="Journal"
        description="Một nơi riêng tư để giữ lại điều đang sống động, trước khi nó trôi qua."
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

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <JournalSearch initialSearch={search} state={state} />
        <JournalStateFilter search={search} state={state} />
      </div>

      {result.data.length ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.meta.totalItems} entry
            {hasFilters ? " phù hợp" : " đang được lưu giữ"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.data.map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
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
