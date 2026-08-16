import type { MemoryState } from "@repo/contracts";
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
  {
    value: undefined,
    label: "Đang lưu giữ",
  },
  {
    value: "TRASHED",
    label: "Trash",
  },
];

const sortFieldOptions: ReadonlyArray<{
  value: MemorySortField;
  label: string;
}> = [
  {
    value: "occurredOn",
    label: "Thời điểm xảy ra",
  },
  {
    value: "updatedAt",
    label: "Lần chỉnh sửa",
  },
  {
    value: "createdAt",
    label: "Ngày lưu",
  },
];

const sortOrderOptions: ReadonlyArray<{
  value: MemorySortOrder;
  label: string;
}> = [
  {
    value: "desc",
    label: "Mới trước",
  },
  {
    value: "asc",
    label: "Cũ trước",
  },
];

interface MemoryCollectionControlsProps {
  search: string;
  state?: MemoryState;
  sortBy: MemorySortField;
  sortOrder: MemorySortOrder;
}

const optionClassName = (active: boolean) =>
  cn(
    "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
    active
      ? "bg-primary font-medium text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function MemoryCollectionControls({
  search,
  state,
  sortBy,
  sortOrder,
}: MemoryCollectionControlsProps) {
  const activeState = state ?? "ACTIVE";

  return (
    <div className="grid gap-4 xl:grid-cols-[auto_1fr] xl:items-start">
      <nav
        aria-label="Lọc ký ức theo trạng thái"
        className="flex overflow-x-auto rounded-xl border bg-card/50 p-1"
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
              className={optionClassName(active)}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 xl:justify-self-end">
        <div className="flex min-w-0 items-center gap-2">
          <span
            id="memory-sort-field-label"
            className="shrink-0 text-xs font-medium text-muted-foreground"
          >
            Sắp xếp
          </span>

          <nav
            aria-labelledby="memory-sort-field-label"
            className="flex min-w-0 overflow-x-auto rounded-xl border bg-card/50 p-1"
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
                  className={optionClassName(active)}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <span
            id="memory-sort-order-label"
            className="shrink-0 text-xs font-medium text-muted-foreground"
          >
            Thứ tự
          </span>

          <nav
            aria-labelledby="memory-sort-order-label"
            className="flex overflow-x-auto rounded-xl border bg-card/50 p-1"
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
                  className={optionClassName(active)}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
