import type { JournalEntryState } from "@repo/contracts";
import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildJournalHref } from "@/features/journal/lib/journal-url";

export function JournalSearch({
  initialSearch,
  state,
}: {
  initialSearch: string;
  state?: JournalEntryState;
}) {
  const clearHref = buildJournalHref({ state });

  return (
    <Form
      action="/journal"
      replace
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
          defaultValue={initialSearch}
          placeholder="Tìm trong tiêu đề hoặc nội dung…"
          className="w-full bg-card/65 pr-9"
        />
        {initialSearch ? (
          <Link
            href={clearHref}
            aria-label="Xóa từ khóa tìm kiếm"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-sm",
              className: "absolute top-1/2 right-1 -translate-y-1/2",
            })}
          >
            <X aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <Button type="submit" variant="outline">
        <Search data-icon="inline-start" aria-hidden="true" />
        Tìm
      </Button>
    </Form>
  );
}
