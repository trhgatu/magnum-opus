"use client";

import type { JournalEntryState } from "@repo/contracts";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Input
        id="journal-search"
        name="search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm trong tiêu đề hoặc nội dung…"
        className="min-w-0 flex-1 bg-card/65"
      />
      <Button type="submit" variant="outline">
        <Search data-icon="inline-start" aria-hidden="true" />
        Tìm
      </Button>
    </form>
  );
}
