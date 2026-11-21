import {
  addDays,
  type CalendarDay,
  eachDay,
  isoWeekday,
} from '@shared/domain/calendar-day';

import type {
  GardenEntryKind,
  GardenMark,
  GardenSchedule,
} from './garden-entry';
import type { GardenVariant } from './garden-subject';

/** Trạng thái một tuần của chủ thể (BA §7.1). */
export type GardenWeekStatus = 'CARED' | 'PENDING' | 'RESTED' | 'SKIPPED';

/** Một dòng sổ, theo thứ tự ghi. */
export interface GardenLedgerRow {
  kind: GardenEntryKind;
  occurredOn: CalendarDay;
  mark: GardenMark | null;
  detail: GardenSchedule | null;
}

export interface GardenWeek {
  /** Thứ Hai của tuần. */
  start: CalendarDay;
  status: GardenWeekStatus;
  /** Tuần có ít nhất một sẹo; nhiều lần tái phạm vẫn là một (BR-GDN-004). */
  scarred: boolean;
}

/** Tuần RESTED liên tiếp thứ mấy thì cỏ bắt đầu mọc (BA §7.2). */
export const WEEDS_THRESHOLD = 3;
/** Cỏ cao nhất bao nhiêu bậc. */
export const WEEDS_MAX = 5;

export function weekStartOf(day: CalendarDay): CalendarDay {
  return addDays(day, 1 - isoWeekday(day));
}

/**
 * Chuỗi tuần từ tuần gieo tới tuần chứa `today` (BA §7.1, BR-GDN-002..007).
 * Mọi ngày tính theo múi giờ tài khoản; dòng sổ trước ngày gieo bị bỏ qua.
 */
export function gardenWeeks(input: {
  variant: GardenVariant;
  plantedOn: CalendarDay;
  today: CalendarDay;
  entries: readonly GardenLedgerRow[];
}): GardenWeek[] {
  const { variant, plantedOn, today } = input;
  if (plantedOn > today) return [];

  const entries = input.entries.filter(
    (entry) => entry.occurredOn >= plantedOn,
  );
  const lifecycle = entries.filter(
    (entry) => entry.kind === 'RESTED' || entry.kind === 'RESUMED',
  );
  // Nhịp có hiệu lực trước ngày gieo vẫn áp dụng từ ngày gieo.
  const rhythms = input.entries.filter((entry) => entry.kind === 'RHYTHM_SET');
  const tendedDays = netTendedDays(entries);
  const scarDays = new Set(
    entries
      .filter((entry) => entry.kind === 'MARKED' && entry.mark === 'SCAR')
      .map((entry) => entry.occurredOn),
  );

  const isAlive = (day: CalendarDay): boolean =>
    latestOnOrBefore(lifecycle, day)?.kind !== 'RESTED';
  const isDue = (day: CalendarDay): boolean => {
    const rhythm = latestOnOrBefore(rhythms, day)?.detail;
    if (!rhythm) return false;
    return rhythm.type === 'DAILY' || rhythm.days.includes(isoWeekday(day));
  };

  const currentWeek = weekStartOf(today);
  const weeks: GardenWeek[] = [];

  for (
    let start = weekStartOf(plantedOn);
    start <= currentWeek;
    start = addDays(start, 7)
  ) {
    const days = eachDay(start, addDays(start, 7)).filter(
      (day) => day >= plantedOn,
    );
    const aliveDays = days.filter(
      (day) => isAlive(day) && (variant === 'BUILD' || day <= today),
    );
    const tended = days.some((day) => tendedDays.has(day));

    weeks.push({
      start,
      status: weekStatus({
        variant,
        alive: aliveDays.length > 0,
        expected: aliveDays.some(isDue),
        tended,
        current: start === currentWeek,
      }),
      scarred: days.some((day) => scarDays.has(day)),
    });
  }

  return weeks;
}

/**
 * Bậc cỏ sau chuỗi tuần (BA §7.2): từ tuần RESTED liên tiếp thứ
 * WEEDS_THRESHOLD trở đi mỗi tuần cao thêm một bậc, tối đa WEEDS_MAX; mỗi tuần
 * CARED gọn đi một bậc; SKIPPED cắt chuỗi đếm và không làm cỏ mọc.
 */
export function weedsAfter(weeks: readonly GardenWeek[]): number {
  let level = 0;
  let restedInRow = 0;

  for (const week of weeks) {
    if (week.status === 'RESTED') {
      restedInRow += 1;
      if (restedInRow >= WEEDS_THRESHOLD)
        level = Math.min(level + 1, WEEDS_MAX);
    } else if (week.status === 'CARED') {
      restedInRow = 0;
      level = Math.max(level - 1, 0);
    } else if (week.status === 'SKIPPED') {
      restedInRow = 0;
    }
  }

  return level;
}

function weekStatus(week: {
  variant: GardenVariant;
  alive: boolean;
  expected: boolean;
  tended: boolean;
  current: boolean;
}): GardenWeekStatus {
  // QUIT: mỗi tuần còn sống là một tuần giữ được (BR-GDN-004).
  if (week.variant === 'QUIT') return week.alive ? 'CARED' : 'SKIPPED';
  // Check-in ngoài lịch vẫn là chăm (BR-GDN-003).
  if (week.tended) return 'CARED';
  if (!week.expected) return 'SKIPPED';
  return week.current ? 'PENDING' : 'RESTED';
}

/** Ngày còn ít nhất một lần chăm sau khi trừ các lần rút lại (BR-GDN-SB-003). */
function netTendedDays(entries: readonly GardenLedgerRow[]): Set<CalendarDay> {
  const net = new Map<CalendarDay, number>();
  for (const entry of entries) {
    const change =
      entry.kind === 'TENDED' ? 1 : entry.kind === 'UNTENDED' ? -1 : 0;
    if (change !== 0) {
      net.set(entry.occurredOn, (net.get(entry.occurredOn) ?? 0) + change);
    }
  }
  return new Set([...net].filter(([, count]) => count > 0).map(([day]) => day));
}

/** Dòng hiệu lực mới nhất tới hết ngày `day`; cùng ngày thì dòng ghi sau thắng. */
function latestOnOrBefore(
  rows: readonly GardenLedgerRow[],
  day: CalendarDay,
): GardenLedgerRow | undefined {
  let latest: GardenLedgerRow | undefined;
  for (const row of rows) {
    if (
      row.occurredOn <= day &&
      (!latest || row.occurredOn >= latest.occurredOn)
    ) {
      latest = row;
    }
  }
  return latest;
}
