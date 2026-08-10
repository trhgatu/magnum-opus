"use client";

import type { JournalEntryState } from "@repo/contracts";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildJournalHref } from "@/features/journal/lib/journal-url";

export function JournalSearch({
  initialSearch,
  state,
}: {
  initialSearch: string;
  state?: JournalEntryState;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (search.trim() === initialSearch) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(buildJournalHref({ search, state }));
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [initialSearch, router, search, state]);

  return (
    <form
      action="/journal"
      method="get"
      className="relative flex min-w-0 gap-2"
      role="search"
    >
      {state ? <input type="hidden" name="state" value={state} /> : null}
      <label htmlFor="journal-search" className="sr-only">
        Tìm trong journal
      </label>
      <div className="relative min-w-0 flex-1">
        <Input
          id="journal-search"
          name="search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm trong tiêu đề hoặc nội dung…"
          className="w-full bg-card/65 pr-9"
          aria-describedby="journal-search-status"
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => setSearch("")}
            aria-label="Xóa từ khóa tìm kiếm"
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Button type="submit" variant="outline">
        <Search data-icon="inline-start" aria-hidden="true" />
        Tìm
      </Button>
      <span id="journal-search-status" className="sr-only" aria-live="polite">
        {isPending ? "Đang cập nhật kết quả" : ""}
      </span>
    </form>
  );
}
