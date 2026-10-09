import { ChronicleMoodLabel } from '../../domain/enums';

import { ChroniclePresenter } from './chronicle.presenter';

describe('ChroniclePresenter', () => {
  it('flattens the sections into the API response and serializes computedAt', () => {
    const response = ChroniclePresenter.toResponse({
      year: 2026,
      month: 8,
      computedAt: new Date('2026-09-01T02:00:00.000Z'),
      sections: {
        habit: {
          buildCompletionRate: 0.78,
          bestStreak: { habitTitle: 'Đọc sách', days: 12 },
          mostConsistentHabit: null,
          quitHabits: [{ habitTitle: 'Thuốc lá', daysSinceLastRelapse: 40 }],
        },
        routine: { completionRate: 0.5 },
        project: { activeCount: 2, completedCount: 1, stoppedCount: 0 },
        journal: { entryCount: 12 },
        mood: {
          dominantMood: ChronicleMoodLabel.CALM,
          distribution: { [ChronicleMoodLabel.CALM]: 3 },
        },
        memory: { memoryCount: 4 },
      },
    });

    expect(response).toEqual({
      year: 2026,
      month: 8,
      computedAt: '2026-09-01T02:00:00.000Z',
      habit: {
        buildCompletionRate: 0.78,
        bestStreak: { habitTitle: 'Đọc sách', days: 12 },
        mostConsistentHabit: null,
        quitHabits: [{ habitTitle: 'Thuốc lá', daysSinceLastRelapse: 40 }],
      },
      routine: { completionRate: 0.5 },
      project: { activeCount: 2, completedCount: 1, stoppedCount: 0 },
      journal: { entryCount: 12 },
      mood: { dominantMood: 'CALM', distribution: { CALM: 3 } },
      memory: { memoryCount: 4 },
    });
  });
});
