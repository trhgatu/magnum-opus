"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  quitStartedAtFromDate,
  quitStartedAtToDate,
  todayAsUtcCalendarDate,
} from "@/features/habit/lib/habit-quit";

export function HabitQuitStartedAtPicker({
  value,
  disabled = false,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = quitStartedAtToDate(value);
  const today = todayAsUtcCalendarDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="habit-quit-started-at"
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal sm:w-72"
        >
          <CalendarIcon aria-hidden="true" />
          {selectedDate ? (
            format(selectedDate, "PPP", { locale: vi })
          ) : (
            <span className="text-muted-foreground">Chọn ngày</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          locale={vi}
          disabled={{ after: today }}
          onSelect={(date) => {
            if (!date) return;
            onChange(quitStartedAtFromDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
