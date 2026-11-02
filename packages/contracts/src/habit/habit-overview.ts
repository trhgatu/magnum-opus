import type { HabitFrequencyType, HabitType } from './habit.js';

export const HABIT_DAY_MARKS = [
  'DONE',
  'MISSED',
  'REST',
  'PENDING',
  'UNTRACKED',
] as const;

/**
 * Một ngày trong dải 7 ngày: DONE đã ghi dấu (hoặc không tái phạm), MISSED có
 * lịch mà bỏ lỡ (hoặc tái phạm), REST không có lịch, PENDING hôm nay chưa xong,
 * UNTRACKED Habit chưa tồn tại, đang lưu trữ hoặc chưa bắt đầu bỏ.
 */
export type HabitDayMark = (typeof HABIT_DAY_MARKS)[number];

export interface HabitOverviewDayResponse {
  date: string;
  mark: HabitDayMark;
}

export interface HabitOverviewItemResponse {
  id: string;
  title: string;
  description: string | null;
  type: HabitType;
  frequencyType: HabitFrequencyType | null;
  frequencyDays: number[];
  quitStartedAt: string | null;
  /** Các Nếp sinh hoạt đang rèn có Habit này. */
  routines: Array<{ id: string; title: string }>;
  dueToday: boolean;
  checkedInToday: boolean;
  /** Lúc ghi dấu hôm nay (ISO), null nếu chưa ghi dấu. */
  checkedInAt: string | null;
  /** BUILD: buổi có lịch liên tiếp đã ghi dấu. QUIT: ngày không tái phạm. */
  currentStreak: number;
  /** BUILD: chuỗi dài nhất. QUIT: null. */
  longestStreak: number | null;
  /** 7 ngày, cũ nhất trước, ngày cuối là hôm nay. */
  lastSevenDays: HabitOverviewDayResponse[];
  /** BUILD: buổi có lịch tiếp theo sau hôm nay, trong 7 ngày tới. */
  nextDueOn: string | null;
}

/** Mọi Habit đang rèn của owner, sắp theo tên (BA habit v3). */
export interface HabitOverviewResponse {
  date: string;
  timeZone: string;
  habits: HabitOverviewItemResponse[];
}

/** Một Habit kèm tổng quan, cho trang chi tiết (BA habit v3). */
export interface HabitOverviewItemEnvelope {
  date: string;
  timeZone: string;
  habit: HabitOverviewItemResponse;
}
