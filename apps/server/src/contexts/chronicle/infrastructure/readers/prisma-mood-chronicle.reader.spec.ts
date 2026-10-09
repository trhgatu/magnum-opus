import { JournalEntryState } from '@repo/database';

import { ChronicleMoodLabel } from '../../domain/enums';
import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaMoodChronicleReader } from './prisma-mood-chronicle.reader';

describe('PrismaMoodChronicleReader', () => {
  const moodModel = { findMany: jest.fn() };
  const prisma = { mood: moodModel };
  const reader = new PrismaMoodChronicleReader(prisma as never);
  const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

  const givenMoods = (...labels: ChronicleMoodLabel[]) =>
    moodModel.findMany.mockResolvedValue(labels.map((label) => ({ label })));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as the mood reader that depends on current state', () => {
    expect(reader.module).toBe('mood');
    expect(reader.schemaVersion).toBe(1);
    expect(reader.historyOnly).toBe(false);
  });

  it('reads moods through their sealed journal entries created in the period, oldest first', async () => {
    givenMoods();

    await reader.getSummary('owner-id', period);

    expect(moodModel.findMany).toHaveBeenCalledWith({
      where: {
        journalEntry: {
          ownerId: 'owner-id',
          state: JournalEntryState.SEALED,
          createdAt: { gte: period.start, lt: period.end },
        },
      },
      select: { label: true },
      orderBy: [{ journalEntry: { createdAt: 'asc' } }, { id: 'asc' }],
    });
  });

  it('counts each label and picks the most frequent one', async () => {
    givenMoods(
      ChronicleMoodLabel.SAD,
      ChronicleMoodLabel.CALM,
      ChronicleMoodLabel.CALM,
      ChronicleMoodLabel.CALM,
      ChronicleMoodLabel.JOYFUL,
    );

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      dominantMood: ChronicleMoodLabel.CALM,
      distribution: {
        [ChronicleMoodLabel.SAD]: 1,
        [ChronicleMoodLabel.CALM]: 3,
        [ChronicleMoodLabel.JOYFUL]: 1,
      },
    });
  });

  it('breaks a tie in favour of the label that appeared first in the period', async () => {
    // Ví dụ "kiểm phiếu": CALM (ngày 2) và SAD (ngày 5) hòa 2–2 → CALM
    // thắng vì xuất hiện trước, kể cả khi SAD đạt 2 phiếu trước CALM.
    givenMoods(
      ChronicleMoodLabel.CALM,
      ChronicleMoodLabel.SAD,
      ChronicleMoodLabel.SAD,
      ChronicleMoodLabel.CALM,
      ChronicleMoodLabel.JOYFUL,
    );

    const summary = await reader.getSummary('owner-id', period);

    expect(summary.dominantMood).toBe(ChronicleMoodLabel.CALM);
  });

  it('returns no dominant mood and an empty distribution for a month without moods', async () => {
    givenMoods();

    await expect(reader.getSummary('owner-id', period)).resolves.toEqual({
      dominantMood: null,
      distribution: {},
    });
  });
});
