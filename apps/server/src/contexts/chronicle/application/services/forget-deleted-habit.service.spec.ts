import { HabitSectionData } from '../section-data';

import {
  ForgetDeletedHabitService,
  forgetHabitTitle,
} from './forget-deleted-habit.service';

const section = (
  overrides: Partial<HabitSectionData> = {},
): HabitSectionData => ({
  buildCompletionRate: 0.8,
  bestStreak: { habitId: 'deleted', habitTitle: 'Chạy bộ', days: 12 },
  mostConsistentHabit: {
    habitId: 'kept',
    habitTitle: 'Đọc sách',
    completionRate: 0.9,
  },
  quitHabits: [
    { habitId: 'deleted', habitTitle: 'Chạy bộ', daysSinceLastRelapse: 3 },
    { habitId: 'kept', habitTitle: 'Thuốc lá', daysSinceLastRelapse: 40 },
  ],
  ...overrides,
});

describe('forgetHabitTitle', () => {
  it('forgets only the title of the deleted habit and keeps every number', () => {
    expect(forgetHabitTitle(section(), 'deleted')).toEqual({
      buildCompletionRate: 0.8,
      bestStreak: { habitId: 'deleted', habitTitle: null, days: 12 },
      mostConsistentHabit: {
        habitId: 'kept',
        habitTitle: 'Đọc sách',
        completionRate: 0.9,
      },
      quitHabits: [
        { habitId: 'deleted', habitTitle: null, daysSinceLastRelapse: 3 },
        { habitId: 'kept', habitTitle: 'Thuốc lá', daysSinceLastRelapse: 40 },
      ],
    });
  });

  it('returns null when the section never mentions the habit', () => {
    expect(forgetHabitTitle(section(), 'other')).toBeNull();
  });

  it('never matches a v1 item that has no habit id', () => {
    const v1 = section({
      bestStreak: { habitId: null, habitTitle: 'Chạy bộ', days: 12 },
      mostConsistentHabit: null,
      quitHabits: [],
    });

    expect(forgetHabitTitle(v1, 'deleted')).toBeNull();
  });
});

describe('ForgetDeletedHabitService', () => {
  const snapshots = {
    findSectionsForOwner: jest.fn(),
    updateSectionData: jest.fn(),
  };
  const service = new ForgetDeletedHabitService(snapshots as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rewrites only the owner sections that mention the deleted habit', async () => {
    snapshots.findSectionsForOwner.mockResolvedValue([
      { id: 'august', module: 'habit', schemaVersion: 2, data: section() },
      {
        id: 'july',
        module: 'habit',
        schemaVersion: 2,
        data: section({
          bestStreak: null,
          mostConsistentHabit: null,
          quitHabits: [],
        }),
      },
    ]);

    await service.execute('owner-id', 'deleted');

    expect(snapshots.findSectionsForOwner).toHaveBeenCalledWith(
      'owner-id',
      'habit',
    );
    expect(snapshots.updateSectionData).toHaveBeenCalledTimes(1);
    expect(snapshots.updateSectionData).toHaveBeenCalledWith(
      'august',
      forgetHabitTitle(section(), 'deleted'),
    );
  });

  it('stays correct when the outbox replays the event', async () => {
    snapshots.findSectionsForOwner.mockResolvedValue([
      {
        id: 'august',
        module: 'habit',
        schemaVersion: 2,
        data: forgetHabitTitle(section(), 'deleted'),
      },
    ]);

    await service.execute('owner-id', 'deleted');

    // Vẫn khớp habitId nên ghi lại cùng giá trị: an toàn, chỉ tốn 1 lệnh ghi.
    expect(snapshots.updateSectionData).toHaveBeenCalledTimes(1);
  });
});
