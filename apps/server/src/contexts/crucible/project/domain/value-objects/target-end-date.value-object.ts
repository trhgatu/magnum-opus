import { InvalidTargetEndDateException } from '../exceptions';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ngày dự kiến kết thúc của Cycle — date-only "YYYY-MM-DD", không giờ, không
 * múi giờ (cùng quy ước với Habit.quitStartedAt). Ngày quá khứ vẫn hợp lệ
 * (BR-PRJ-036); chỉ chặn chuỗi sai định dạng hoặc ngày không có thật.
 */
export class TargetEndDate {
  private constructor(public readonly value: string) {}

  public static create(raw: string): TargetEndDate {
    if (!TargetEndDate.isRealDate(raw)) {
      throw new InvalidTargetEndDateException(raw);
    }

    return new TargetEndDate(raw);
  }

  private static isRealDate(raw: string): boolean {
    if (!DATE_ONLY.test(raw)) return false;

    // "2026-13-45" thành Invalid Date (toISOString sẽ ném lỗi) — loại trước.
    const date = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return false;

    // Round-trip bắt ngày không tồn tại: "2026-02-30" thành 2026-03-02.
    return date.toISOString().slice(0, 10) === raw;
  }
}
