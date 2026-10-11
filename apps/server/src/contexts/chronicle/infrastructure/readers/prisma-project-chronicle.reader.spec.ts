import { ProjectLifecycleState } from '@repo/database';

import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaProjectChronicleReader } from './prisma-project-chronicle.reader';

const { ACTIVE, PAUSED, STOPPED, COMPLETED } = ProjectLifecycleState;

describe('PrismaProjectChronicleReader', () => {
  const transitionModel = { findMany: jest.fn() };
  const prisma = { projectLifecycleTransition: transitionModel };
  const reader = new PrismaProjectChronicleReader(prisma as never);
  // Tháng 9/2026 theo UTC cho dễ đọc mốc giờ trong test.
  const period = ChroniclePeriod.forMonth(2026, 9, 'UTC');

  const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
  const transition = (
    projectId: string,
    toState: ProjectLifecycleState,
    occurredAt: Date,
  ) => ({ projectId, toState, occurredAt });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as a history-only project reader', () => {
    expect(reader.module).toBe('project');
    expect(reader.schemaVersion).toBe(1);
    // Chỉ đọc nhật ký transition bất biến — được phép tính lại khi nâng
    // phiên bản (DAP-CHR-008 loại b).
    expect(reader.historyOnly).toBe(true);
  });

  it("reads the owner's transitions up to the end of the period, oldest first", async () => {
    transitionModel.findMany.mockResolvedValue([]);

    await reader.getSummary('owner-id', period);

    expect(transitionModel.findMany).toHaveBeenCalledWith({
      where: {
        project: { ownerId: 'owner-id' },
        occurredAt: { lt: period.end },
      },
      select: { projectId: true, toState: true, occurredAt: true },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('counts the worked example from the reader walkthrough', async () => {
    transitionModel.findMany.mockResolvedValue([
      transition('C', ACTIVE, at('2026-06-05')),
      transition('A', ACTIVE, at('2026-08-03')),
      transition('C', PAUSED, at('2026-08-30')),
      transition('B', ACTIVE, at('2026-09-01')),
      transition('B', STOPPED, at('2026-09-10')),
      transition('B', ACTIVE, at('2026-09-12')),
      transition('A', COMPLETED, at('2026-09-15')),
      transition('B', STOPPED, at('2026-09-28')),
    ]);

    // A: ACTIVE từ tháng 8 + Complete trong tháng → active, completed.
    // B: Start trong tháng, Stop 2 lần → active, stopped (1 project).
    // C: đầu tháng đang PAUSED, không có gì trong tháng → không tính.
    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      activeCount: 2,
      completedCount: 1,
      stoppedCount: 1,
    });
  });

  it('counts a project that stays active all month without any transition in it', async () => {
    transitionModel.findMany.mockResolvedValue([
      transition('P', ACTIVE, at('2026-03-01')),
    ]);

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      activeCount: 1,
      completedCount: 0,
      stoppedCount: 0,
    });
  });

  it('uses only the latest state before the period to decide the starting state', async () => {
    transitionModel.findMany.mockResolvedValue([
      transition('P', ACTIVE, at('2026-05-01')),
      transition('P', COMPLETED, at('2026-07-01')),
    ]);

    // Đã COMPLETED trước tháng 9 → không active, và lần Complete thuộc
    // tháng 7 nên không được đếm vào tháng 9.
    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      activeCount: 0,
      completedCount: 0,
      stoppedCount: 0,
    });
  });

  it('treats a transition at exactly the period start as inside the period', async () => {
    transitionModel.findMany.mockResolvedValue([
      transition('P', ACTIVE, at('2026-08-01')),
      transition('P', COMPLETED, period.start),
    ]);

    // Complete đúng 00:00 ngày 1/9 thuộc tháng 9 (khoảng [start, end)).
    // Project vẫn active trong tháng 9 vì đầu tháng (trước mốc đó) nó
    // đang ACTIVE.
    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      activeCount: 1,
      completedCount: 1,
      stoppedCount: 0,
    });
  });

  it('returns zeros when the owner has no project history', async () => {
    transitionModel.findMany.mockResolvedValue([]);

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      activeCount: 0,
      completedCount: 0,
      stoppedCount: 0,
    });
  });
});
