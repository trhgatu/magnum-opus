const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function quitStartedAtFromDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function quitStartedAtToDate(value: string): Date | undefined {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);

  date.setHours(12, 0, 0, 0);
  date.setFullYear(year!, month! - 1, day);

  // setFullYear() cuộn ngày không hợp lệ (vd. 2026-02-30) sang tháng kế
  // tiếp thay vì báo lỗi — đối chiếu lại các thành phần để phát hiện đúng.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month! - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

export function formatQuitStartedAt(value: string): string {
  const date = quitStartedAtToDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

/**
 * "Hôm nay" theo ngày lịch UTC — khớp với cách server chuẩn hóa
 * quitStartedAt (Habit.startOfUtcDay), không phải theo giờ địa phương
 * trình duyệt. Cần thiết vì với múi giờ dương (vd. UTC+7), "hôm nay"
 * theo giờ địa phương có thể đã sang ngày mới trong khi UTC vẫn còn
 * ngày hôm trước — nếu dùng giờ địa phương làm mặc định/giới hạn chọn,
 * request có thể bị từ chối vì "quitStartedAt là ngày trong tương lai".
 */
export function todayAsUtcCalendarDate(): Date {
  const now = new Date();
  return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
