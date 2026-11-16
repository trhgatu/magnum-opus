import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { ProjectCycleClosedEvent } from '../../domain/events';
import { ProjectCycleClosed } from '../../contracts/project-cycle-closed.contract';

@Injectable()
@OutboxPublisher([
  publish({
    event: ProjectCycleClosedEvent,
    as: ProjectCycleClosed,
    aggregateId: (event) => event.projectId,
    toPayload: (event) => ({
      projectId: event.projectId,
      ownerId: event.ownerId,
      cycleId: event.cycleId,
      endReason: event.endReason,
      closedAt: event.closedAt.toISOString(),
    }),
  }),
])
export class ProjectOutbox {}
