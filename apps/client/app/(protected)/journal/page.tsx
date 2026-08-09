import type { JournalEntryState } from "@repo/contracts";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/system/empty-state";
import { PageHeading } from "@/components/system/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <section className="flex flex-col gap-8" aria-labelledby="journal-heading">
      <PageHeading
        id="journal-heading"
        eyebrow="Reflection"
        title="Journal"
        description="Một nơi riêng tư để giữ lại điều đang sống động trong mày, trước khi nó trôi qua."
        actions={
          <form action={createJournalEntry}>
            <CreateEntryButton />
          </form>
        }
      />

      {params.createFailed === "1" ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Chưa thể tạo entry mới. Hãy thử lại sau một lát.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <JournalSearch initialSearch={search} state={state} />

        <nav
          aria-label="Lọc journal theo trạng thái"
          className="flex flex-wrap gap-1 rounded-xl border bg-card/50 p-1 text-sm"
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
                "rounded-lg px-3 py-1.5 transition-colors " +
                (state === value
                  ? "bg-primary font-medium text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {result.data.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.data.map((entry) => (
            <Link
              key={entry.id}
              href={"/journal/" + entry.id}
              className="group flex min-h-48 flex-col rounded-2xl border bg-card/65 p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_60px_-38px_color-mix(in_oklch,var(--foreground)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display line-clamp-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {entry.title || "Không có tiêu đề"}
                </h2>
                <Badge variant="outline" className="shrink-0">
                  {entry.state}
                </Badge>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {entry.content || "Một trang trắng đang chờ mày."}
              </p>
              <time
                className="mt-auto pt-6 font-mono text-[11px] text-muted-foreground"
                dateTime={entry.updatedAt}
              >
                Cập nhật {formatUpdatedAt(entry.updatedAt)}
              </time>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có entry phù hợp"
          description={
            search
              ? "Thử một từ khóa khác hoặc bỏ bộ lọc hiện tại."
              : state === "TRASHED"
                ? "Trash đang trống."
                : "Bắt đầu bằng một dòng đang có trong đầu mày."
          }
        />
      )}

      {result.meta.totalPages > 1 ? (
        <nav
          aria-label="Phân trang Journal"
          className="flex items-center justify-between text-sm"
        >
          <span className="text-muted-foreground">
            Trang {result.meta.currentPage} / {result.meta.totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={hrefFor({ page: page - 1, search, state })}>
                  Trang trước
                </Link>
              </Button>
            ) : null}
            {page < result.meta.totalPages ? (
              <Button asChild variant="outline">
                <Link href={hrefFor({ page: page + 1, search, state })}>
                  Trang sau
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
