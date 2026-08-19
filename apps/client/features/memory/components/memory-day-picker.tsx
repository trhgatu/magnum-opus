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
  memoryCalendarDateFromDate,
  memoryCalendarDateToDate,
} from "@/features/memory/lib/memory-form";

interface MemoryDayPickerProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function MemoryDayPicker({
  value,
  disabled = false,
  onChange,
}: MemoryDayPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = memoryCalendarDateToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="memory-occurred-on"
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon aria-hidden="true" />

          {selectedDate ? (
            format(selectedDate, "PPP", {
              locale: vi,
            })
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
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange(memoryCalendarDateFromDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
