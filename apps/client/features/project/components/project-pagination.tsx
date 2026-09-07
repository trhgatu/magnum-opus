import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  buildProjectHref,
  parseProjectLocation,
} from "@/features/project/lib/project-url";

export function ProjectPagination({
  location,
  totalPages,
}: {
  location: ReturnType<typeof parseProjectLocation>;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Phân trang Project"
      className="flex items-center justify-between text-sm"
    >
      <span className="text-muted-foreground">
        Trang {location.page} / {totalPages}
      </span>
      <div className="flex gap-2">
        {location.page > 1 ? (
          <Link
            rel="prev"
            href={buildProjectHref({ ...location, page: location.page - 1 })}
            className={buttonVariants({ variant: "outline" })}
          >
            <ChevronLeft aria-hidden="true" /> Trước
          </Link>
        ) : null}
        {location.page < totalPages ? (
          <Link
            rel="next"
            href={buildProjectHref({ ...location, page: location.page + 1 })}
            className={buttonVariants({ variant: "outline" })}
          >
            Sau <ChevronRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
