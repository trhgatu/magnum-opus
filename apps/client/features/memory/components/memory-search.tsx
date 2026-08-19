import type { MemoryState } from "@repo/contracts";
import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildMemoryHref,
  DEFAULT_MEMORY_SORT_FIELD,
  DEFAULT_MEMORY_SORT_ORDER,
  type MemorySortField,
  type MemorySortOrder,
} from "@/features/memory/lib/memory-url";

interface MemorySearchProps {
  search: string;
  state?: MemoryState;
  sortBy: MemorySortField;
  sortOrder: MemorySortOrder;
}

export function MemorySearch({
  search,
  state,
  sortBy,
  sortOrder,
}: MemorySearchProps) {
  const clearHref = buildMemoryHref({
    state,
    sortBy,
    sortOrder,
  });

  return (
    <Form
      action="/memories"
      replace
      role="search"
      className="flex min-w-0 gap-2"
    >
      {state === "TRASHED" ? (
        <input type="hidden" name="state" value="TRASHED" />
      ) : null}

      {sortBy !== DEFAULT_MEMORY_SORT_FIELD ? (
        <input type="hidden" name="sortBy" value={sortBy} />
      ) : null}

      {sortOrder !== DEFAULT_MEMORY_SORT_ORDER ? (
        <input type="hidden" name="sortOrder" value={sortOrder} />
      ) : null}

      <div className="relative min-w-0 flex-1">
        <label htmlFor="memory-search" className="sr-only">
          Tìm trong ký ức
        </label>

        <Input
          id="memory-search"
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Tìm trong tiêu đề hoặc nội dung…"
          className="w-full bg-card/65 pr-9"
        />

        {search ? (
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
