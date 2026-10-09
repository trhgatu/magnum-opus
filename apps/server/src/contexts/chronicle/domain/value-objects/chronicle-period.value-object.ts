import {
  addDays,
  calendarDayAt,
  calendarDayOf,
  CalendarDay,
} from '../calendar-day';
import { ChroniclePeriodType } from '../enums';

import { InvalidChronicleMonthException } from '../exceptions';

const MIN_YEAR = 1970;
// 9998, không phải 9999: tháng 12/9999 có endDate là năm 10000 — ra khỏi
// định dạng YYYY-MM-DD mà CalendarDay và so sánh chuỗi dựa vào.
const MAX_YEAR = 9998;

/**
 * Một kỳ Chronicle (V1 chỉ có tháng) theo múi giờ của owner (KD-CHR-011).
 *
 * Mang 2 cặp ranh giới, cả hai đều nửa mở `[from, to)`:
 * - `firstDate`/`endDate`: ngày lịch dạng date-only (`YYYY-MM-DDT00:00Z`),
 *   dùng cho cột date-only như `HabitCheckIn.date` — vốn đã lưu ngày lịch
 *   của owner, nên so trực tiếp, không quy đổi múi giờ.
 * - `start`/`end`: thời điểm thật (instant) của 00:00 ngày đầu tháng và
 *   00:00 ngày đầu tháng sau tại múi giờ owner, dùng cho cột timestamp như
 *   `JournalEntry.createdAt`, `ProjectLifecycleTransition.occurredAt`.
 */
export class ChroniclePeriod {
  private constructor(
    public readonly type: ChroniclePeriodType,
    public readonly key: string,
    public readonly timeZone: string,
    public readonly firstDate: Date,
    public readonly endDate: Date,
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  public static forMonth(
    year: number,
    month: number,
    timeZone: string,
  ): ChroniclePeriod {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < MIN_YEAR ||
      year > MAX_YEAR ||
      month < 1 ||
      month > 12
    ) {
      throw new InvalidChronicleMonthException(year, month);
    }

    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    const key = `${year}-${String(month).padStart(2, '0')}`;
    const firstDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1));

    return new ChroniclePeriod(
      ChroniclePeriodType.MONTH,
      key,
      timeZone,
      firstDate,
      endDate,
      zonedMidnightToInstant(firstDate, timeZone),
      zonedMidnightToInstant(endDate, timeZone),
    );
  }

  public static currentMonthKey(now: Date, timeZone: string): string {
    return calendarDayAt(now, timeZone).slice(0, 7);
  }

  public isCurrent(now: Date): boolean {
    return this.key === ChroniclePeriod.currentMonthKey(now, this.timeZone);
  }

  public isInFuture(now: Date): boolean {
    // So chuỗi `YYYY-MM` an toàn vì năm luôn đủ 4 chữ số (MIN_YEAR..MAX_YEAR).
    return this.key > ChroniclePeriod.currentMonthKey(now, this.timeZone);
  }

  /**
   * Khoảng ngày lịch được tính số liệu, nửa mở [from, to). Kỳ đã đóng: cả
   * kỳ. Kỳ hiện tại: chỉ tới hết HÔM NAY theo múi giờ owner — mẫu số "đến
   * hôm nay" (02-domain-analysis.md §5), tránh tỷ lệ thấp giả tạo đầu tháng.
   */
  public countableDays(now: Date): { from: CalendarDay; to: CalendarDay } {
    const from = calendarDayOf(this.firstDate);

    if (!this.isCurrent(now)) {
      return { from, to: calendarDayOf(this.endDate) };
    }

    return { from, to: addDays(calendarDayAt(now, this.timeZone), 1) };
  }
}

/**
 * Quy đổi "00:00 của ngày `date` (date-only, UTC-midnight) tại `timeZone`"
 * ra instant thật. Đoán bằng chính UTC-midnight, đo độ lệch giờ địa phương
 * tại đó rồi bù lại; đo lại lần 2 vì độ lệch có thể đổi (DST) giữa điểm
 * đoán và kết quả.
 *
 * Giới hạn đã biết: ở vài múi giờ hiếm, đồng hồ nhảy qua đúng 00:00 (vd
 * Casablanca DST 2008–2009, Kiritimati 1979) — ngày đó không có 00:00 địa
 * phương, kết quả rơi vào thời điểm chuyển giờ gần nhất. Chấp nhận: chỉ lệch
 * ranh giới của đúng tháng đó ở những múi giờ đó, trong quá khứ xa.
 */
function zonedMidnightToInstant(date: Date, timeZone: string): Date {
  const guess = date.getTime();
  const firstOffset = offsetAt(guess, timeZone);
  const candidate = guess - firstOffset;
  const secondOffset = offsetAt(candidate, timeZone);

  return new Date(guess - secondOffset);
}

/** Độ lệch (ms) giữa giờ đồng hồ tại `timeZone` và UTC ở thời điểm `epochMs`. */
function offsetAt(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(epochMs));

  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value);

  const wallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );

  return wallClockAsUtc - (epochMs - (epochMs % 1000));
}
