import { HabitHistory } from './habit-month-summary';
import { RoutineHistory, summarizeRoutines } from './routine-month-summary';

const SEPTEMBER = { from: '2026-09-01', to: '2026-10-01' };

const habit = (
  id: string,
  checkInDays: string[],
  overrides: Partial<HabitHistory> = {},
): HabitHistory => ({
  id,
  title: id,
  type: 'BUILD',
  createdOn: '2026-01-01',
  lifecycle: [],
  schedules: [
    {
      frequencyType: 'DAILY',
      frequencyDays: [],
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    },
  ],
  checkInDays: new Set(checkInDays),
  quitStartedOn: null,
  relapseDays: [],
  ...overrides,
});

const routine = (overrides: Partial<RoutineHistory> = {}): RoutineHistory => ({
  createdOn: '2026-01-01',
  lifecycle: [],
  memberships: [],
  ...overrides,
});

const range = (from: string, to: string) => ({ from, to });

describe('summarizeRoutines', () => {
  it('counts a session as completed only when every due member habit checked in', () => {
    // 3 ngày, 2 Habit hằng ngày: ngày 1 đủ cả 2, ngày 2 thiếu B, ngày 3 đủ.
    const a = habit('A', ['2026-09-01', '2026-09-02', '2026-09-03']);
    const b = habit('B', ['2026-09-01', '2026-09-03']);

    const result = summarizeRoutines(
      [
        routine({
          memberships: [
            { habit: a, addedOn: '2026-01-01', removedOn: null },
            { habit: b, addedOn: '2026-01-01', removedOn: null },
          ],
        }),
      ],
      range('2026-09-01', '2026-09-04'),
    );

    expect(result.completionRate).toBeCloseTo(2 / 3);
  });

  it('only asks the habits that are members and due on that day', () => {
    // B chỉ nằm trong Routine từ 3/9; A làm Thứ 4 (2/9) — ngày 1/9 (Thứ 3)
    // A không đến hạn, B chưa là thành viên → không có buổi.
    const a = habit('A', ['2026-09-02'], {
      schedules: [
        {
          frequencyType: 'WEEKLY',
          frequencyDays: [3],
          effectiveFrom: '2026-01-01',
          effectiveTo: null,
        },
      ],
    });
    const b = habit('B', ['2026-09-03']);

    const result = summarizeRoutines(
      [
        routine({
          memberships: [
            { habit: a, addedOn: '2026-01-01', removedOn: null },
            { habit: b, addedOn: '2026-09-03', removedOn: null },
          ],
        }),
      ],
      range('2026-09-01', '2026-09-04'),
    );

    // Buổi: 2/9 (A, hoàn thành), 3/9 (B, hoàn thành).
    expect(result.completionRate).toBe(1);
  });

  it('stops counting a habit from the day it was removed from the routine', () => {
    // B bị gỡ ngày 2/9 và không check-in từ đó — không kéo buổi xuống.
    const a = habit('A', ['2026-09-01', '2026-09-02', '2026-09-03']);
    const b = habit('B', ['2026-09-01']);

    const result = summarizeRoutines(
      [
        routine({
          memberships: [
            { habit: a, addedOn: '2026-01-01', removedOn: null },
            { habit: b, addedOn: '2026-01-01', removedOn: '2026-09-02' },
          ],
        }),
      ],
      range('2026-09-01', '2026-09-04'),
    );

    expect(result.completionRate).toBe(1);
  });

  it('has no session on days the routine is archived', () => {
    const a = habit('A', ['2026-09-01']);

    const result = summarizeRoutines(
      [
        routine({
          lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-02' }],
          memberships: [{ habit: a, addedOn: '2026-01-01', removedOn: null }],
        }),
      ],
      range('2026-09-01', '2026-09-04'),
    );

    // Chỉ còn buổi 1/9, hoàn thành.
    expect(result.completionRate).toBe(1);
  });

  it('has no session on days the member habit itself is archived', () => {
    const a = habit('A', [], {
      lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-01' }],
    });

    const result = summarizeRoutines(
      [
        routine({
          memberships: [{ habit: a, addedOn: '2026-01-01', removedOn: null }],
        }),
      ],
      SEPTEMBER,
    );

    expect(result.completionRate).toBe(0);
  });

  it('pools sessions across routines', () => {
    const a = habit('A', ['2026-09-01', '2026-09-02']);
    const b = habit('B', []);

    const result = summarizeRoutines(
      [
        routine({
          memberships: [{ habit: a, addedOn: '2026-01-01', removedOn: null }],
        }),
        routine({
          memberships: [{ habit: b, addedOn: '2026-01-01', removedOn: null }],
        }),
      ],
      range('2026-09-01', '2026-09-03'),
    );

    // 4 buổi, 2 hoàn thành.
    expect(result.completionRate).toBe(0.5);
  });

  it('returns 0 when there was no session at all', () => {
    expect(summarizeRoutines([], SEPTEMBER)).toEqual({ completionRate: 0 });
    expect(summarizeRoutines([routine()], SEPTEMBER)).toEqual({
      completionRate: 0,
    });
  });
});
