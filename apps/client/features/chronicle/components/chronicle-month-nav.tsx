import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  type ChronicleMonth,
  chronicleHref,
  formatChronicleMonth,
  shiftMonth,
} from "@/features/chronicle/lib/chronicle-month";
import { cn } from "@/lib/utils";

interface ChronicleMonthNavProps {
  month: ChronicleMonth;
  isCurrentMonth: boolean;
}

export function ChronicleMonthNav({
  month,
  isCurrentMonth,
}: ChronicleMonthNavProps) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <nav aria-label="Chuyển tháng" className="flex flex-wrap gap-2">
      <Link
        href={chronicleHref(previous)}
        className={buttonVariants({ variant: "outline" })}
      >
        <ChevronLeft aria-hidden="true" />
        {formatChronicleMonth(previous)}
      </Link>
      {/* Không có tháng tương lai (KD-CHR-007) — tới tháng hiện tại thì khóa. */}
      {isCurrentMonth ? (
        <span
          aria-disabled="true"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "pointer-events-none opacity-50",
          )}
        >
          {formatChronicleMonth(next)}
          <ChevronRight aria-hidden="true" />
        </span>
      ) : (
        <Link
          href={chronicleHref(next)}
          className={buttonVariants({ variant: "outline" })}
        >
          {formatChronicleMonth(next)}
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}
