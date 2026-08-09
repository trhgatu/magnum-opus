import type { JournalEntryState } from "@repo/contracts";
import type { Metadata } from "next";
import Link from "next/link";

import { createJournalEntry } from "@/features/journal/actions/journal";
import { getJournalEntries } from "@/features/journal/api/journal";
import { CreateEntryButton } from "@/features/journal/components/create-entry-button";
import { JournalSearch } from "@/features/journal/components/journal-search";

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

const hrefFor = (input: {
  page?: number;
  search?: string;
  state?: JournalEntryState;
}) => {
  const params = new URLSearchParams();
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.search) params.set("search", input.search);
  if (input.state) params.set("state", input.state);
  const query = params.toString();
  return query ? "/journal?" + query : "/journal";
};

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const page = numberFrom(params.page);
  const search = String(
    Array.isArray(params.search) ? params.search[0] : (params.search ?? ""),
  ).trim();
  const state = stateFrom(params.state);
  const result = await getJournalEntries({ page, limit: 20, search, state });

  return (
    <section className="flex flex-col gap-7" aria-labelledby="journal-heading">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Reflection
          </p>
          <h1
            id="journal-heading"
            className="text-3xl font-bold tracking-tight"
          >
            Journal
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Một nơi riêng tư để giữ lại điều đang sống động trong mày, trước khi
            nó trôi qua.
          </p>
        </div>
        <form action={createJournalEntry}>
          <CreateEntryButton />
        </form>
      </header>

      {params.createFailed === "1" ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          Chưa thể tạo entry mới. Hãy thử lại sau một lát.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <JournalSearch initialSearch={search} state={state} />

        <nav
          aria-label="Lọc journal theo trạng thái"
          className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900"
        >
          {(
            [
              [undefined, "Đang lưu giữ"],
              ["DRAFT", "Draft"],
              ["SEALED", "Sealed"],
              ["TRASHED", "Trash"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={label}
              href={hrefFor({ search, state: value })}
              aria-current={state === value ? "page" : undefined}
              className={
                "rounded-md px-3 py-1.5 " +
                (state === value
                  ? "bg-white font-medium shadow-sm dark:bg-zinc-800"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white")
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {result.data.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.data.map((entry) => (
            <Link
              key={entry.id}
              href={"/journal/" + entry.id}
              className="group flex min-h-40 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="line-clamp-2 font-semibold tracking-tight">
                  {entry.title || "Không có tiêu đề"}
                </h2>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  {entry.state}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {entry.content || "Một trang trắng đang chờ mày."}
              </p>
              <time
                className="mt-auto pt-5 text-xs text-zinc-500"
                dateTime={entry.updatedAt}
              >
                Cập nhật {formatUpdatedAt(entry.updatedAt)}
              </time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <h2 className="font-semibold">Chưa có entry phù hợp</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {search
              ? "Thử một từ khóa khác hoặc bỏ bộ lọc hiện tại."
              : state === "TRASHED"
                ? "Trash đang trống."
                : "Bắt đầu bằng một dòng đang có trong đầu mày."}
          </p>
        </div>
      )}

      {result.meta.totalPages > 1 ? (
        <nav
          aria-label="Phân trang Journal"
          className="flex items-center justify-between text-sm"
        >
          <span className="text-zinc-500">
            Trang {result.meta.currentPage} / {result.meta.totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="rounded-md border px-3 py-2"
                href={hrefFor({ page: page - 1, search, state })}
              >
                Trang trước
              </Link>
            ) : null}
            {page < result.meta.totalPages ? (
              <Link
                className="rounded-md border px-3 py-2"
                href={hrefFor({ page: page + 1, search, state })}
              >
                Trang sau
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
