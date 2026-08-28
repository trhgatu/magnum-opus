import { Archive, Clock3, Flame, ListFilter } from "lucide-react";
import Link from "next/link";

import {
  buildHabitHref,
  type HabitLocation,
} from "@/features/habit/lib/habit-url";
import { cn } from "@/lib/utils";

export function HabitCollectionControls({
  location,
}: {
  location: Required<HabitLocation>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <nav
        aria-label="Lọc trạng thái"
        className="flex rounded-xl border bg-background/70 p-1"
      >
        {(["ACTIVE", "ARCHIVED"] as const).map((status) => (
          <Link
            key={status}
            href={buildHabitHref({ ...location, page: 1, status })}
            aria-current={location.status === status ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              location.status === status
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {status === "ACTIVE" ? (
              <>
                <Flame className="size-3.5" aria-hidden="true" /> Đang rèn
              </>
            ) : (
              <>
                <Archive className="size-3.5" aria-hidden="true" /> Lưu trữ
              </>
            )}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Sắp xếp thói quen"
        className="flex rounded-xl border bg-background/70 p-1"
      >
        {(["updatedAt", "title"] as const).map((sortBy) => (
          <Link
            key={sortBy}
            href={buildHabitHref({
              ...location,
              page: 1,
              sortBy,
              sortOrder: sortBy === "title" ? "asc" : "desc",
            })}
            aria-current={location.sortBy === sortBy ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              location.sortBy === sortBy
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {sortBy === "updatedAt" ? (
              <>
                <Clock3 className="size-3.5" aria-hidden="true" /> Mới cập nhật
              </>
            ) : (
              <>
                <ListFilter className="size-3.5" aria-hidden="true" /> Theo tên
              </>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
