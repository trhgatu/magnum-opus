import { Project } from '../../domain/project.aggregate';
import type { FocusCandidate } from '../ports/project-reader.port';
import { chooseFocusProject } from './focus-project';

describe('chooseFocusProject', () => {
  afterEach(() => jest.useRealTimers());

  const startedOn = (title: string, startedAt: string): Project => {
    jest.useFakeTimers({ now: new Date(startedAt) });
    const project = Project.create({ ownerId: 'owner-id', title });
    project.start();
    jest.useRealTimers();
    return project;
  };

  const candidate = (
    title: string,
    startedAt: string,
    lastActivityAt: string | null,
  ): FocusCandidate => ({
    project: startedOn(title, startedAt),
    lastActivityAt: lastActivityAt ? new Date(lastActivityAt) : null,
  });

  const titleOf = (focus: FocusCandidate | null) => focus?.project.title;

  it('returns null without running Projects', () => {
    expect(chooseFocusProject([])).toBeNull();
  });

  it('picks the Project with the most recent activity', () => {
    const focus = chooseFocusProject([
      candidate(
        'Older activity',
        '2026-10-20T00:00:00Z',
        '2026-11-01T08:00:00Z',
      ),
      candidate(
        'Newer activity',
        '2026-09-01T00:00:00Z',
        '2026-11-04T08:00:00Z',
      ),
    ]);

    expect(titleOf(focus)).toBe('Newer activity');
  });

  it('puts any activity ahead of a Project without activity', () => {
    const focus = chooseFocusProject([
      candidate('Fresh cycle, no activity', '2026-11-04T00:00:00Z', null),
      candidate(
        'Old cycle, some activity',
        '2026-08-01T00:00:00Z',
        '2026-09-01T00:00:00Z',
      ),
    ]);

    expect(titleOf(focus)).toBe('Old cycle, some activity');
  });

  it('falls back to the most recently started Cycle without activity', () => {
    const focus = chooseFocusProject([
      candidate('Started earlier', '2026-10-01T00:00:00Z', null),
      candidate('Started later', '2026-10-15T00:00:00Z', null),
    ]);

    expect(titleOf(focus)).toBe('Started later');
  });

  it('breaks an activity tie by the most recently started Cycle', () => {
    const focus = chooseFocusProject([
      candidate(
        'Started earlier',
        '2026-10-01T00:00:00Z',
        '2026-11-04T08:00:00Z',
      ),
      candidate(
        'Started later',
        '2026-10-15T00:00:00Z',
        '2026-11-04T08:00:00Z',
      ),
    ]);

    expect(titleOf(focus)).toBe('Started later');
  });

  it('does not reorder the input', () => {
    const candidates = [
      candidate('A', '2026-10-01T00:00:00Z', null),
      candidate('B', '2026-10-15T00:00:00Z', null),
    ];

    chooseFocusProject(candidates);

    expect(candidates.map(titleOf)).toEqual(['A', 'B']);
  });
});
