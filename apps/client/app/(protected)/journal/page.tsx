import type { JournalEntryState } from "@repo/contracts";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/system/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/features/account/api/current-user";
import { createJournalEntry } from "@/features/journal/actions/journal";
import {
  getJournalEntries,
  getJournalSummary,
} from "@/features/journal/api/journal";
import { CreateEntryButton } from "@/features/journal/components/create-entry-button";
import { JournalDayRow } from "@/features/journal/components/journal-day-row";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import { JournalSearch } from "@/features/journal/components/journal-search";
import {
  JournalListSkeleton,
  JournalMetaSkeleton,
  JournalTodaySkeleton,
} from "@/features/journal/components/journal-skeletons";
import { JournalStateFilter } from "@/features/journal/components/journal-state-filter";
import { groupJournalByMonth } from "@/features/journal/lib/journal-groups";
import { buildJournalHref } from "@/features/journal/lib/journal-url";
import { journalEntryToday } from "@/features/today/lib/today-focus";

export const metadata: Metadata = {
  title: "Nhật ký",
  robots: { index: false, follow: false },
};

interface JournalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type EntriesPromise = ReturnType<typeof getJournalEntries>;

const QUIET_LINK =
  "inline-flex h-10 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

/** "38 trang · đã viết 5 trong 7 ngày qua." */
async function JournalSummary({
  entriesPromise,
  summaryPromise,
  state,
}: {
  entriesPromise: EntriesPromise;
  summaryPromise: Promise<{ writtenDaysLast7: number } | null>;
  state: JournalEntryState | undefined;
}) {
  const [entries, summary] = await Promise.all([
    entriesPromise.catch(() => null),
    summaryPromise,
  ]);
  if (!entries) return null;
  const total = entries.meta.totalItems;
  if (state === "TRASHED") {
    return total === 0
      ? "Thùng rác đang trống."
      : `${total} trang chờ xóa hẳn. Khôi phục thì còn nguyên.`;
  }
  if (state) return `${total} trang.`;
  return summary
    ? `${total} trang · đã viết ${summary.writtenDaysLast7} trong 7 ngày qua.`
    : `${total} trang.`;
}

/** Khung hôm nay: đã có trang thì mở lại, chưa có thì mời viết. */
async function JournalToday({
  latestPromise,
  today,
  timeZone,
}: {
  latestPromise: EntriesPromise;
  today: string;
  timeZone: string;
}) {
  const latest = await latestPromise.catch(() => null);
  const entry = journalEntryToday(latest?.data[0], today, timeZone);
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone,
  })
    .format(new Date(`${today}T12:00:00.000Z`))
    .replace(",", " ·");

  return (
    <section
      aria-label="Hôm nay"
      className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-ember-soft px-5 py-5 sm:px-7"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {dateLabel}
        </p>
        <h2 className="font-display text-2xl">
          {entry
            ? `Hôm nay đã có một trang: ${entry.title || "Không có tiêu đề"}`
            : "Hôm nay chưa có trang nào."}
        </h2>
      </div>
      {entry ? (
        <div className="flex flex-wrap gap-2.5">
          <Link
            href={`/journal/${entry.id}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Mở trang hôm nay
          </Link>
          <form action={createJournalEntry}>
            <CreateEntryButton />
          </form>
        </div>
      ) : (
        <form action={createJournalEntry}>
          <CreateEntryButton label="Viết trang hôm nay" />
        </form>
      )}
    </section>
  );
}

async function JournalList({
  entriesPromise,
  search,
  state,
  hasFilters,
  timeZone,
}: {
  entriesPromise: EntriesPromise;
  search: string;
  state: JournalEntryState | undefined;
  hasFilters: boolean;
  timeZone: string;
}) {
  const result = await entriesPromise;

  if (result.data.length === 0) {
    return (
      <EmptyState
        title="Chưa có trang phù hợp"
        description={
          search
            ? "Thử một từ khóa khác hoặc bỏ bộ lọc hiện tại."
            : state === "TRASHED"
              ? "Thùng rác đang trống."
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
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p aria-live="polite" className="sr-only">
        {result.meta.totalItems} kết quả
      </p>
      {groupJournalByMonth(result.data, timeZone).map((month) => (
        <section
          key={month.label}
          aria-label={month.label}
          className="flex flex-col"
        >
          <h2 className="border-b pb-3 font-display text-2xl tracking-[-0.01em]">
            {month.label}
          </h2>
          <ul className="flex flex-col">
            {month.days.map((day) => (
              <JournalDayRow key={day.entry.id} day={day} />
            ))}
          </ul>
        </section>
      ))}

      <JournalPagination
        page={result.meta.currentPage}
        totalPages={result.meta.totalPages}
        search={search}
        state={state}
      />
    </div>
  );
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const page = numberFrom(params.page);
  const search = String(
    Array.isArray(params.search) ? params.search[0] : (params.search ?? ""),
  ).trim();
  const state = stateFrom(params.state);
  const hasFilters = Boolean(search || state);
  const createFailed = Array.isArray(params.createFailed)
    ? params.createFailed[0] === "1"
    : params.createFailed === "1";
  // Một promise dùng chung cho câu tóm tắt lẫn danh sách: apiFetch không
  // dedupe theo URL. Xếp theo ngày tạo để các tháng liền nhau.
  const entriesPromise = getJournalEntries({
    page,
    limit: 20,
    search,
    state,
    sortBy: "createdAt",
  });
  const summaryPromise = getJournalSummary().catch(() => null);
  // Trang mới nhất cho khung hôm nay, không phụ thuộc bộ lọc đang chọn.
  const latestPromise = getJournalEntries({ limit: 1, sortBy: "createdAt" });
  // getCurrentUser() đã được layout gọi trong cùng request (React cache).
  const user = await getCurrentUser();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: user.timeZone,
  }).format(new Date());

  return (
    <section className="flex flex-col gap-8" aria-labelledby="journal-heading">
      <header className="flex max-w-3xl flex-col gap-2.5">
        <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Reflection
        </p>
        <h1
          id="journal-heading"
          className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] sm:text-[46px]"
        >
          {state === "TRASHED" ? "Nhật ký trong Thùng rác" : "Nhật ký"}
        </h1>
        {/* div, không phải p: skeleton là <div>, nằm trong <p> thì HTML
            không hợp lệ, trình duyệt tách ra và hydrate lệch. */}
        <div className="text-base text-muted-foreground sm:text-[17px]">
          <Suspense fallback={<JournalMetaSkeleton />}>
            <JournalSummary
              entriesPromise={entriesPromise}
              summaryPromise={summaryPromise}
              state={state}
            />
          </Suspense>
        </div>
      </header>

      {createFailed ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Chưa thể tạo trang mới. Hãy thử lại sau một lát.
          </AlertDescription>
        </Alert>
      ) : null}

      {state === "TRASHED" ? null : (
        <Suspense fallback={<JournalTodaySkeleton />}>
          <JournalToday
            latestPromise={latestPromise}
            today={today}
            timeZone={user.timeZone}
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full min-w-0 lg:max-w-sm">
            <JournalSearch initialSearch={search} state={state} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {state === "TRASHED" ? (
              <Link href={buildJournalHref({ search })} className={QUIET_LINK}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Nhật ký đang
                lưu giữ
              </Link>
            ) : (
              <>
                <JournalStateFilter search={search} state={state} />
                <Link
                  href={buildJournalHref({ search, state: "TRASHED" })}
                  className={QUIET_LINK}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Thùng rác
                </Link>
              </>
            )}
          </div>
        </div>

        <Suspense
          key={`${state}:${search}:${page}`}
          fallback={<JournalListSkeleton />}
        >
          <JournalList
            entriesPromise={entriesPromise}
            search={search}
            state={state}
            hasFilters={hasFilters}
            timeZone={user.timeZone}
          />
        </Suspense>
      </div>
    </section>
  );
}
