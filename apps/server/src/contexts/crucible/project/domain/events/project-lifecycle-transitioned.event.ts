import { DomainEvent } from '@shared/domain/events/domain-event';

import { ProjectLifecycleAction, ProjectLifecycleState } from '../enums';

export class ProjectLifecycleTransitionedEvent extends DomainEvent {
  constructor(
    public readonly projectId: string,
    public readonly cycleId: string | null,
    public readonly action: ProjectLifecycleAction,
    public readonly fromState: ProjectLifecycleState,
    public readonly toState: ProjectLifecycleState,
  ) {
    super();
  }
}
