import { ListCycleSnapshotsQuery } from '..';
import { ListCycleSnapshotsHandler } from './list-cycle-snapshots.handler';

describe('ListCycleSnapshotsHandler', () => {
  const declarations = { read: jest.fn(), exists: jest.fn() };
  const snapshots = {
    exists: jest.fn(),
    createIfAbsent: jest.fn(),
    listByProject: jest.fn(),
  };
  const handler = new ListCycleSnapshotsHandler(declarations, snapshots);
  const query = () =>
    new ListCycleSnapshotsQuery({ ownerId: 'owner-id', projectId: 'p' });

  beforeEach(() => jest.clearAllMocks());

  it('returns the snapshots exactly as stored', async () => {
    const stored = [{ cycleId: 'cycle-2' }, { cycleId: 'cycle-1' }];
    declarations.exists.mockResolvedValue(true);
    snapshots.listByProject.mockResolvedValue(stored);

    const result = await handler.execute(query());

    expect(result.getValue()).toBe(stored);
    expect(snapshots.listByProject).toHaveBeenCalledWith('owner-id', 'p');
  });

  it('refuses a project the owner does not have', async () => {
    declarations.exists.mockResolvedValue(false);

    const result = await handler.execute(query());

    expect(result.getError().error.code).toBe('PROJECT_NOT_FOUND');
    expect(snapshots.listByProject).not.toHaveBeenCalled();
  });
});
