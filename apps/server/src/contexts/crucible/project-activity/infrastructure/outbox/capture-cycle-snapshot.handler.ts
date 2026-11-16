import { Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { ProjectCycleClosed } from '@/contexts/crucible/project/contracts/project-cycle-closed.contract';
import { CaptureCycleSnapshotService } from '../../application/services/capture-cycle-snapshot.service';

type Payload = PayloadOf<typeof ProjectCycleClosed>;

@Injectable()
@OutboxHandler(ProjectCycleClosed)
export class CaptureCycleSnapshotHandler implements OutboxEventHandler<Payload> {
  constructor(private readonly cycleSnapshots: CaptureCycleSnapshotService) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.cycleSnapshots.capture({
      ownerId: payload.ownerId,
      projectId: payload.projectId,
      cycleId: payload.cycleId,
      closedAt: payload.closedAt,
    });
  }
}
