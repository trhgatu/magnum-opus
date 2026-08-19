"use client";

import type { MemoryDatePrecision } from "@repo/contracts";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MemoryDayPicker = dynamic(
  () =>
    import("@/features/memory/components/memory-day-picker").then(
      (module) => module.MemoryDayPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-9 animate-pulse rounded-lg border bg-muted/40"
        aria-label="Đang tải lịch"
      />
    ),
  },
);

const precisionOptions: ReadonlyArray<{
  value: MemoryDatePrecision;
  label: string;
}> = [
  {
    value: "DAY",
    label: "Ngày cụ thể",
  },
  {
    value: "MONTH",
    label: "Tháng",
  },
  {
    value: "YEAR",
    label: "Năm",
  },
  {
    value: "UNKNOWN",
    label: "Không rõ thời gian",
  },
];

interface MemoryDateFieldProps {
  precision: MemoryDatePrecision;
  value: string;
  disabled?: boolean;
  onPrecisionChange: (precision: MemoryDatePrecision) => void;
  onValueChange: (value: string) => void;
}

export function MemoryDateField({
  precision,
  value,
  disabled = false,
  onPrecisionChange,
  onValueChange,
}: MemoryDateFieldProps) {
  return (
    <fieldset
      className="space-y-4 rounded-2xl border bg-card/45 p-4 sm:p-5"
      disabled={disabled}
    >
      <legend className="px-1 text-sm font-medium">Thời điểm xảy ra</legend>

      <div className="space-y-2">
        <Label htmlFor="memory-date-precision">
          Độ chính xác của thời gian
        </Label>

        <Select
          name="occurredOnPrecision"
          value={precision}
          disabled={disabled}
          onValueChange={(nextPrecision) =>
            onPrecisionChange(nextPrecision as MemoryDatePrecision)
          }
        >
          <SelectTrigger id="memory-date-precision" className="w-full">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {precisionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {precision === "UNKNOWN" ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Ký ức vẫn có thể được lưu khi thời điểm xảy ra không còn được nhớ
          chính xác.
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="memory-occurred-on">Thời điểm xảy ra</Label>

          {precision === "DAY" ? (
            <MemoryDayPicker
              value={value}
              disabled={disabled}
              onChange={onValueChange}
            />
          ) : (
            <Input
              id="memory-occurred-on"
              name="occurredOn"
              type={precision === "MONTH" ? "month" : "number"}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              min={precision === "YEAR" ? 1 : undefined}
              max={precision === "YEAR" ? 9999 : undefined}
              step={precision === "YEAR" ? 1 : undefined}
              required
            />
          )}
        </div>
      )}
    </fieldset>
  );
}
