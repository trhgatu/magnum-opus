import type { JournalEntryListItemResponse } from "@repo/contracts";

export interface JournalDay {
  entry: JournalEntryListItemResponse;
  /** Ngày trong tháng, hai chữ số: "01". */
  day: string;
  /** Thứ viết tắt: "CN", "T2"… "T7". */
  weekday: string;
}

export interface JournalMonth {
  /** "Tháng 11, 2026". */
  label: string;
  days: JournalDay[];
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** Ngày tạo của trang theo múi giờ tài khoản, dạng YYYY-MM-DD. */
function localDay(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(instant),
  );
}

/**
 * Nhóm trang Nhật ký theo tháng viết (thiết kế "Nhật ký", Figma), giữ nguyên
 * thứ tự server trả về; danh sách cần xếp theo ngày tạo để tháng liền nhau.
 */
export function groupJournalByMonth(
  entries: readonly JournalEntryListItemResponse[],
  timeZone: string,
): JournalMonth[] {
  const months: JournalMonth[] = [];
  for (const entry of entries) {
    const local = localDay(entry.createdAt, timeZone);
    const [year, month, day] = local.split("-");
    const label = `Tháng ${Number(month)}, ${year}`;
    const weekday =
      WEEKDAYS[new Date(`${local}T00:00:00.000Z`).getUTCDay()] ?? "";
    const last = months.at(-1);
    const item = { entry, day: day ?? "", weekday };
    if (last?.label === label) last.days.push(item);
    else months.push({ label, days: [item] });
  }
  return months;
}
