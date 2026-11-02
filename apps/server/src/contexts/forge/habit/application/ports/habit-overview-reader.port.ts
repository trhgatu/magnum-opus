import type { CalendarDay } from '@shared/domain/calendar-day';

import type { HabitOverviewHistory } from '../../domain/services/habit-overview';

export const HABIT_OVERVIEW_READER = Symbol('HABIT_OVERVIEW_READER');

export interface HabitOverviewRow extends HabitOverviewHistory {
  id: string;
  title: string;
  description: string | null;
  frequencyType: 'DAILY' | 'WEEKLY' | null;
  frequencyDays: number[];
  routines: Array<{ id: string; title: string }>;
  /** Lúc tạo bản ghi check-in theo từng ngày, để biết giờ ghi dấu hôm nay. */
  checkInAt: ReadonlyMap<CalendarDay, Date>;
}

export interface HabitOverviewReader {
  /**
   * Mọi Habit đang rèn của owner kèm lịch sử cần để tính tổng quan, sắp theo
   * tên. Ngày tái phạm tính theo `timeZone` của owner.
   */
  findActiveForOwner(
    ownerId: string,
    timeZone: string,
  ): Promise<HabitOverviewRow[]>;
}
