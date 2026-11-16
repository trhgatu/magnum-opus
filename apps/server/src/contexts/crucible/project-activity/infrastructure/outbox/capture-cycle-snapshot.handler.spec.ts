import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { ProjectCycleClosed } from '@/contexts/crucible/project/contracts/project-cycle-closed.contract';
import { ProjectCycleEndReason } from '@/contexts/crucible/project/domain/enums';

import { CaptureCycleSnapshotHandler } from './capture-cycle-snapshot.handler';

describe('CaptureCycleSnapshotHandler', () => {
  it('listens to ProjectCycleClosed', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, CaptureCycleSnapshotHandler),
    ).toBe(ProjectCycleClosed);
  });

  it('captures the activity snapshot of the closed cycle', async () => {
    const snapshots = { capture: jest.fn().mockResolvedValue(undefined) };
    const closedAt = new Date('2026-10-12T17:00:00.000Z');

    await new CaptureCycleSnapshotHandler(snapshots as never).handle({
      eventId: 'event-id',
      occurredAt: closedAt,
      payload: {
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleId: 'cycle-id',
        endReason: ProjectCycleEndReason.COMPLETED,
        closedAt,
      },
    });

    expect(snapshots.capture).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      projectId: 'project-id',
      cycleId: 'cycle-id',
      closedAt,
    });
  });
});
