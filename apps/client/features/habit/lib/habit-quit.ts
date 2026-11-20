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
 * "Hôm nay" theo giờ trình duyệt, dùng làm ngày mặc định và giới hạn chọn
 * của quitStartedAt. Server so với ngày theo múi giờ tài khoản; hai ngày này
 * chỉ lệch khi trình duyệt khác múi giờ tài khoản, và khi đó server vẫn chặn.
 */
export function todayAsLocalCalendarDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
