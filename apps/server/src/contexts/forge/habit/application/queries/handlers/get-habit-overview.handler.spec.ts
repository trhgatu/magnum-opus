import type { Clock } from '../../ports/clock.port';
import type {
  HabitOverviewReader,
  HabitOverviewRow,
} from '../../ports/habit-overview-reader.port';
import type { UserTimeZoneReader } from '../../ports/user-time-zone-reader.port';
import { GetHabitOverviewQuery } from '../get-habit-overview.query';
import { GetHabitOverviewHandler } from './get-habit-overview.handler';

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

describe('GetHabitOverviewHandler', () => {
  const reader: jest.Mocked<HabitOverviewReader> = {
    findActiveForOwner: jest.fn(),
    findOneForOwner: jest.fn(),
  };
  const timeZones: jest.Mocked<UserTimeZoneReader> = {
    getForUser: jest.fn(),
  };
  // 23:50 UTC ngày 1/11 là 06:50 ngày 2/11 ở Việt Nam.
  const clock: Clock = { now: () => new Date('2026-11-01T23:50:00.000Z') };
  const handler = new GetHabitOverviewHandler(reader, timeZones, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    timeZones.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
    reader.findActiveForOwner.mockResolvedValue([row()]);
  });

  it("uses today in the owner's time zone", async () => {
    const result = (
      await handler.execute(new GetHabitOverviewQuery('owner-1'))
    ).unwrap();

    expect(reader.findActiveForOwner).toHaveBeenCalledWith(
      'owner-1',
      'Asia/Ho_Chi_Minh',
    );
    expect(result.date).toBe('2026-11-02');
    expect(result.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it("summarises each habit and keeps today's check-in time", async () => {
    const result = (
      await handler.execute(new GetHabitOverviewQuery('owner-1'))
    ).unwrap();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.overview.checkedInToday).toBe(true);
    expect(result.items[0]?.overview.currentStreak).toBe(2);
    expect(result.items[0]?.checkedInAt).toEqual(
      new Date('2026-11-01T23:30:00.000Z'),
    );
  });

  it('leaves the check-in time empty when today is not checked in', async () => {
    reader.findActiveForOwner.mockResolvedValue([
      row({ checkInDays: new Set(['2026-11-01']), checkInAt: new Map() }),
    ]);

    const result = (
      await handler.execute(new GetHabitOverviewQuery('owner-1'))
    ).unwrap();

    expect(result.items[0]?.checkedInAt).toBeNull();
    expect(result.items[0]?.overview.lastSevenDays.at(-1)?.mark).toBe(
      'PENDING',
    );
  });
});
