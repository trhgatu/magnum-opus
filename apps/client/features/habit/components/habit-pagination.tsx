import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  buildHabitHref,
  type HabitLocation,
} from "@/features/habit/lib/habit-url";

export function HabitPagination({
  location,
  totalPages,
}: {
  location: Required<HabitLocation>;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Phân trang thói quen"
      className="flex items-center justify-between text-sm"
    >
      <span className="text-muted-foreground">
        Trang {location.page} / {totalPages}
      </span>
      <div className="flex gap-2">
        {location.page > 1 ? (
          <Link
            rel="prev"
            href={buildHabitHref({ ...location, page: location.page - 1 })}
            className={buttonVariants({ variant: "outline" })}
          >
            <ChevronLeft aria-hidden="true" /> Trước
          </Link>
        ) : null}
        {location.page < totalPages ? (
          <Link
            rel="next"
            href={buildHabitHref({ ...location, page: location.page + 1 })}
            className={buttonVariants({ variant: "outline" })}
          >
            Sau <ChevronRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
