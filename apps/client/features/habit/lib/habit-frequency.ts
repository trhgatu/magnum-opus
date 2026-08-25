import type { HabitFrequencyType } from "@repo/contracts";

export const ISO_WEEKDAYS = [
  { value: 1, shortLabel: "T2", label: "Thứ Hai" },
  { value: 2, shortLabel: "T3", label: "Thứ Ba" },
  { value: 3, shortLabel: "T4", label: "Thứ Tư" },
  { value: 4, shortLabel: "T5", label: "Thứ Năm" },
  { value: 5, shortLabel: "T6", label: "Thứ Sáu" },
  { value: 6, shortLabel: "T7", label: "Thứ Bảy" },
  { value: 7, shortLabel: "CN", label: "Chủ nhật" },
] as const;

export function normalizeFrequencyDays(
  type: HabitFrequencyType,
  days: readonly number[],
): number[] {
  if (type === "DAILY") return [];
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((left, right) => left - right);
}

export function formatHabitFrequency(
  type: HabitFrequencyType,
  days: readonly number[],
): string {
  if (type === "DAILY") return "Mỗi ngày";
  const normalized = normalizeFrequencyDays(type, days);
  return normalized.length > 0
    ? normalized
        .map(
          (day) => ISO_WEEKDAYS.find((item) => item.value === day)?.shortLabel,
        )
        .filter(Boolean)
        .join(" · ")
    : "Chưa chọn ngày";
}

export function habitHistoryRange(today: string, days = 90) {
  const to = new Date(`${today}T00:00:00.000Z`);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));

  return {
    from: from.toISOString().slice(0, 10),
    to: today,
  };
}
