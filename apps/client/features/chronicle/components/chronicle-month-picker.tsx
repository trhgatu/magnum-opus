"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type ChronicleMonth,
  chronicleHref,
  compareMonths,
  formatChronicleMonth,
  isChronicleMonthInRange,
} from "@/features/chronicle/lib/chronicle-month";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

interface ChronicleMonthPickerProps {
  month: ChronicleMonth;
  currentMonth: ChronicleMonth;
}

export function ChronicleMonthPicker({
  month,
  currentMonth,
}: ChronicleMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.year);

  const canBrowseBack = isChronicleMonthInRange({ year: year - 1, month: 12 });
  const canBrowseForward = year < currentMonth.year;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setYear(month.year);
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarDays aria-hidden="true" />
          Chọn tháng
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Năm ${year - 1}`}
            disabled={!canBrowseBack}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="font-mono text-sm font-semibold tabular-nums">{year}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Năm ${year + 1}`}
            disabled={!canBrowseForward}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <ul className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((value) => {
            const candidate = { year, month: value };
            const isViewed = compareMonths(candidate, month) === 0;
            // Không có tháng tương lai (KD-CHR-007).
            const isFuture = compareMonths(candidate, currentMonth) > 0;

            return (
              <li key={value}>
                {isFuture ? (
                  <span
                    role="link"
                    aria-disabled="true"
                    aria-label={formatChronicleMonth(candidate)}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "pointer-events-none w-full opacity-40",
                    )}
                  >
                    T{value}
                  </span>
                ) : (
                  <Link
                    href={chronicleHref(candidate)}
                    aria-label={formatChronicleMonth(candidate)}
                    aria-current={isViewed ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant: isViewed ? "default" : "ghost",
                        size: "sm",
                      }),
                      "w-full",
                    )}
                  >
                    T{value}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
