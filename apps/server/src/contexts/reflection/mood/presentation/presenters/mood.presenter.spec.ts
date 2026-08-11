import { MoodLabel } from '../../domain/enums';
import { Mood } from '../../domain/mood.aggregate';
import { MoodId } from '../../domain/value-objects';
import { MoodPresenter } from './mood.presenter';

describe('MoodPresenter', () => {
  it('returns the public API shape without ownership internals', () => {
    const mood = Mood.rehydrate({
      id: new MoodId('mood-1'),
      journalEntryId: 'entry-1',
      label: MoodLabel.CALM,
      intensity: 3,
      note: 'Quiet after the rain',
      revision: 2,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    });

    expect(MoodPresenter.toResponse(mood)).toEqual({
      id: 'mood-1',
      journalEntryId: 'entry-1',
      label: 'CALM',
      intensity: 3,
      note: 'Quiet after the rain',
      revision: 2,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
  });
});
