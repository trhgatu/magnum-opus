"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildTimeZoneIndex,
  filterTimeZoneIndex,
  formatUtcOffset,
  timeZoneOptions,
} from "@/features/account/lib/time-zone";
import { cn } from "@/lib/utils";

interface TimeZonePickerProps {
  value: string;
  onValueChange: (timeZone: string) => void;
  disabled?: boolean;
  /** id của phần tử làm nhãn — đặt tên truy cập cho combobox. */
  labelId?: string;
  /** id của phần mô tả — screen reader đọc kèm khi focus combobox. */
  describedById?: string;
}

export function TimeZonePicker({
  value,
  onValueChange,
  disabled = false,
  labelId,
  describedById,
}: TimeZonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Chỉ dựng khi popover mở — lúc đó chắc chắn đang ở trình duyệt, nên
  // danh sách lấy từ Intl của trình duyệt, không lệch với server. Phần tốn
  // (gọi Intl ~420 lần) không phụ thuộc query, nên gõ phím chỉ chạy bước lọc.
  const index = useMemo(
    () => (open ? buildTimeZoneIndex(timeZoneOptions(value)) : []),
    [open, value],
  );
  const entries = useMemo(
    () => filterTimeZoneIndex(index, query),
    [index, query],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const choose = (zone: string) => {
    onValueChange(zone);
    handleOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-labelledby={labelId}
          aria-describedby={describedById}
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between sm:flex-1"
        >
          <span className="truncate">
            {value} ({formatUtcOffset(value)})
          </span>
          <ChevronsUpDown className="opacity-55" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-2 rounded-xl p-2 shadow-lg"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo thành phố, nước hoặc GMT+7"
            aria-label="Tìm múi giờ"
            className="pl-8"
            autoComplete="off"
          />
        </div>

        <div
          role="listbox"
          aria-label="Múi giờ"
          className="max-h-64 overflow-y-auto"
        >
          {entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy múi giờ phù hợp.
            </p>
          ) : (
            entries.map(({ zone, offset }) => (
              <Button
                key={zone}
                type="button"
                variant="ghost"
                role="option"
                aria-selected={zone === value}
                onClick={() => choose(zone)}
                className="h-9 w-full justify-start"
              >
                <Check
                  className={cn(
                    "mr-1",
                    zone === value ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{zone}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {offset}
                </span>
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
