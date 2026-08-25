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
        className="flex rounded-lg border bg-background/70 p-0.5"
      >
        {(["ACTIVE", "ARCHIVED"] as const).map((status) => (
          <Link
            key={status}
            href={buildHabitHref({ ...location, page: 1, status })}
            aria-current={location.status === status ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              location.status === status
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {status === "ACTIVE" ? "Đang rèn luyện" : "Đã lưu trữ"}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Sắp xếp thói quen"
        className="flex rounded-lg border bg-background/70 p-0.5"
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
              "rounded-md px-3 py-1.5 text-sm",
              location.sortBy === sortBy
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {sortBy === "updatedAt" ? "Mới cập nhật" : "Theo tên"}
          </Link>
        ))}
      </nav>
    </div>
  );
}
