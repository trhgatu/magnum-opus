import { DomainEvent } from '@shared/domain/events/domain-event';

import { ProjectCycleEndReason } from '../enums';

/**
 * Một Cycle thực sự khép lại (Stop/Complete từ ACTIVE/PAUSED). Đi qua outbox
 * cùng transaction với lần khép, để project-activity chụp snapshot (07 §6).
 */
export class ProjectCycleClosedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly cycleId: string,
    public readonly endReason: ProjectCycleEndReason,
    /** Cùng thời điểm với lần chuyển trạng thái khép Cycle. */
    public readonly closedAt: Date,
  ) {
    super();
  }
}
