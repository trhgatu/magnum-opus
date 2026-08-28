import Link from "next/link";

import {
  buildRoutineHref,
  type RoutineLocation,
} from "@/features/routine/lib/routine-url";
import { cn } from "@/lib/utils";

export function RoutineCollectionControls({
  location,
}: {
  location: Required<RoutineLocation>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <nav
        aria-label="Lọc trạng thái Routine"
        className="flex rounded-lg border bg-background/70 p-0.5"
      >
        {(["ACTIVE", "ARCHIVED"] as const).map((status) => (
          <Link
            key={status}
            href={buildRoutineHref({ ...location, page: 1, status })}
            aria-current={location.status === status ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              location.status === status
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {status === "ACTIVE" ? "Đang hoạt động" : "Đã lưu trữ"}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Sắp xếp Routine"
        className="flex rounded-lg border bg-background/70 p-0.5"
      >
        {(["updatedAt", "title"] as const).map((sortBy) => (
          <Link
            key={sortBy}
            href={buildRoutineHref({
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
