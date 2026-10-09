import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  type ChronicleMonth,
  chronicleHref,
  formatChronicleMonth,
  isChronicleMonthInRange,
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
  const previousContent = (
    <>
      <ChevronLeft aria-hidden="true" />
      {formatChronicleMonth(previous)}
    </>
  );
  const nextContent = (
    <>
      {formatChronicleMonth(next)}
      <ChevronRight aria-hidden="true" />
    </>
  );

  return (
    <nav aria-label="Chuyển tháng" className="flex flex-wrap gap-2">
      {/* Tháng đầu tiên Chronicle nhận (01/1970) thì không có tháng trước. */}
      {isChronicleMonthInRange(previous) ? (
        <Link
          href={chronicleHref(previous)}
          className={buttonVariants({ variant: "outline" })}
        >
          {previousContent}
        </Link>
      ) : (
        <DisabledMonthLink>{previousContent}</DisabledMonthLink>
      )}
      {/* Không có tháng tương lai (KD-CHR-007) — tới tháng hiện tại thì khóa. */}
      {isCurrentMonth ? (
        <DisabledMonthLink>{nextContent}</DisabledMonthLink>
      ) : (
        <Link
          href={chronicleHref(next)}
          className={buttonVariants({ variant: "outline" })}
        >
          {nextContent}
        </Link>
      )}
    </nav>
  );
}

function DisabledMonthLink({ children }: { children: React.ReactNode }) {
  // role="link" để screen reader đọc được trạng thái aria-disabled.
  return (
    <span
      role="link"
      aria-disabled="true"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "pointer-events-none opacity-50",
      )}
    >
      {children}
    </span>
  );
}
