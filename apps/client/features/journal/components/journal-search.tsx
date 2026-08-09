"use client";

import type { JournalEntryState } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function JournalSearch({
  initialSearch,
  state,
}: {
  initialSearch: string;
  state?: JournalEntryState;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (search.trim() === initialSearch) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (state) params.set("state", state);
      const query = params.toString();
      router.replace(query ? "/journal?" + query : "/journal");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [initialSearch, router, search, state]);

  return (
    <form action="/journal" method="get" className="flex gap-2">
      {state ? <input type="hidden" name="state" value={state} /> : null}
      <label htmlFor="journal-search" className="sr-only">
        Tìm trong journal
      </label>
      <input
        id="journal-search"
        name="search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm trong tiêu đề hoặc nội dung…"
        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-800"
      />
      <button
        type="submit"
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Tìm
      </button>
    </form>
  );
}
