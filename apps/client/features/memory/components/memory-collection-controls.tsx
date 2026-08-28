import type { MemoryState } from "@repo/contracts";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import Link from "next/link";

import {
  buildMemoryHref,
  type MemorySortField,
  type MemorySortOrder,
} from "@/features/memory/lib/memory-url";
import { cn } from "@/lib/utils";

const stateOptions: ReadonlyArray<{
  value: MemoryState | undefined;
  label: string;
}> = [
  { value: undefined, label: "Đang lưu giữ" },
  { value: "TRASHED", label: "Trash" },
];

const sortFieldOptions: ReadonlyArray<{
  value: MemorySortField;
  label: string;
}> = [
  { value: "occurredOn", label: "Thời điểm xảy ra" },
  { value: "updatedAt", label: "Lần chỉnh sửa" },
  { value: "createdAt", label: "Ngày lưu" },
];

const sortOrderOptions: ReadonlyArray<{
  value: MemorySortOrder;
  label: string;
}> = [
  { value: "desc", label: "Mới trước" },
  { value: "asc", label: "Cũ trước" },
];

interface MemoryCollectionControlsProps {
  search: string;
  state?: MemoryState;
  sortBy: MemorySortField;
  sortOrder: MemorySortOrder;
}

const stateOptionClassName = (active: boolean) =>
  cn(
    "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

const sortOptionClassName = (active: boolean) =>
  cn(
    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
    active
      ? "bg-muted font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );

export function MemoryCollectionControls({
  search,
  state,
  sortBy,
  sortOrder,
}: MemoryCollectionControlsProps) {
  const activeState = state ?? "ACTIVE";
  const currentSortField = sortFieldOptions.find(
    (option) => option.value === sortBy,
  )!;
  const currentSortOrder = sortOrderOptions.find(
    (option) => option.value === sortOrder,
  )!;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
      <nav
        aria-label="Lọc ký ức theo trạng thái"
        className="flex shrink-0 rounded-xl border bg-background/70 p-1"
      >
        {stateOptions.map((option) => {
          const optionState = option.value ?? "ACTIVE";
          const active = activeState === optionState;

          return (
            <Link
              key={optionState}
              href={buildMemoryHref({
                search,
                state: option.value,
                sortBy,
                sortOrder,
              })}
              aria-current={active ? "page" : undefined}
              className={stateOptionClassName(active)}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      <div className="memory-sort-control min-w-0 flex-1 sm:flex-none">
        <button
          type="button"
          popoverTarget="memory-sort-popover"
          className="memory-sort-trigger flex h-10 w-full items-center gap-2 rounded-xl border bg-background/70 px-3 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72"
        >
          <ArrowUpDown
            className="memory-sort-chevron size-4 shrink-0 text-muted-foreground transition-transform"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">
            <span className="hidden text-muted-foreground sm:inline">
              Sắp xếp:{" "}
            </span>
            {currentSortField.label} · {currentSortOrder.label}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>

        <div
          id="memory-sort-popover"
          popover="auto"
          className="memory-sort-popover w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          <div className="space-y-1">
            <p
              id="memory-sort-field-label"
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              Sắp xếp theo
            </p>
            <nav
              aria-labelledby="memory-sort-field-label"
              className="grid gap-0.5"
            >
              {sortFieldOptions.map((option) => {
                const active = sortBy === option.value;

                return (
                  <Link
                    key={option.value}
                    href={buildMemoryHref({
                      search,
                      state,
                      sortBy: option.value,
                      sortOrder,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={sortOptionClassName(active)}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "size-4",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-2 space-y-1 border-t pt-2">
            <p
              id="memory-sort-order-label"
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              Thứ tự
            </p>
            <nav
              aria-labelledby="memory-sort-order-label"
              className="grid gap-0.5"
            >
              {sortOrderOptions.map((option) => {
                const active = sortOrder === option.value;

                return (
                  <Link
                    key={option.value}
                    href={buildMemoryHref({
                      search,
                      state,
                      sortBy,
                      sortOrder: option.value,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={sortOptionClassName(active)}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "size-4",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
