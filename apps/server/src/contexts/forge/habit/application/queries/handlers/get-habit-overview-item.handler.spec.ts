import { HabitNotFoundException } from '../../../domain/exceptions';
import type { Clock } from '../../ports/clock.port';
import type {
  HabitOverviewReader,
  HabitOverviewRow,
} from '../../ports/habit-overview-reader.port';
import type { UserTimeZoneReader } from '../../ports/user-time-zone-reader.port';
import { GetHabitOverviewItemQuery } from '../get-habit-overview-item.query';
import { GetHabitOverviewItemHandler } from './get-habit-overview-item.handler';

const row = (overrides: Partial<HabitOverviewRow> = {}): HabitOverviewRow => ({
  id: 'habit-1',
  title: 'Thiền 10 phút',
  description: null,
  type: 'BUILD',
  frequencyType: 'DAILY',
  frequencyDays: [],
  createdOn: '2026-10-01',
  lifecycle: [],
  schedules: [
    {
      frequencyType: 'DAILY',
      frequencyDays: [],
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
    },
  ],
  checkInDays: new Set(['2026-11-01', '2026-11-02']),
  checkInAt: new Map([['2026-11-02', new Date('2026-11-01T23:30:00.000Z')]]),
  quitStartedOn: null,
  relapseDays: new Set(),
  routines: [],
  ...overrides,
});

describe('GetHabitOverviewItemHandler', () => {
  const reader: jest.Mocked<HabitOverviewReader> = {
    findActiveForOwner: jest.fn(),
    findOneForOwner: jest.fn(),
  };
  const timeZones: jest.Mocked<UserTimeZoneReader> = {
    getForUser: jest.fn(),
  };
  // 23:50 UTC ngày 1/11 là 06:50 ngày 2/11 ở Việt Nam.
  const clock: Clock = { now: () => new Date('2026-11-01T23:50:00.000Z') };
  const handler = new GetHabitOverviewItemHandler(reader, timeZones, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    timeZones.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
    reader.findOneForOwner.mockResolvedValue(row());
  });

  it("reads the owner's habit for today in their time zone", async () => {
    const result = (
      await handler.execute(new GetHabitOverviewItemQuery('habit-1', 'owner-1'))
    ).unwrap();

    expect(reader.findOneForOwner).toHaveBeenCalledWith(
      'owner-1',
      'habit-1',
      'Asia/Ho_Chi_Minh',
    );
    expect(result.date).toBe('2026-11-02');
    expect(result.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it("summarises the habit and keeps today's check-in time", async () => {
    const { item } = (
      await handler.execute(new GetHabitOverviewItemQuery('habit-1', 'owner-1'))
    ).unwrap();

    expect(item.habit.id).toBe('habit-1');
    expect(item.overview.checkedInToday).toBe(true);
    expect(item.overview.currentStreak).toBe(2);
    expect(item.checkedInAt).toEqual(new Date('2026-11-01T23:30:00.000Z'));
  });

  it('summarises an archived habit without counting the archived days', async () => {
    // Lưu trữ từ 31/10: ba ngày cuối không được theo dõi.
    reader.findOneForOwner.mockResolvedValue(
      row({
        lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-10-31' }],
        checkInDays: new Set(['2026-10-29', '2026-10-30']),
        checkInAt: new Map(),
      }),
    );

    const { item } = (
      await handler.execute(new GetHabitOverviewItemQuery('habit-1', 'owner-1'))
    ).unwrap();

    expect(
      item.overview.lastSevenDays.slice(-3).map((day) => day.mark),
    ).toEqual(['UNTRACKED', 'UNTRACKED', 'UNTRACKED']);
    expect(item.overview.longestStreak).toBe(2);
    expect(item.checkedInAt).toBeNull();
  });

  it('fails with not found when the habit is missing or belongs to someone else', async () => {
    reader.findOneForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetHabitOverviewItemQuery('habit-1', 'owner-1'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
  });
});
