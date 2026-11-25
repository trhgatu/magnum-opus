import type { OnThisDayKind } from '@repo/contracts';
import { DomainEvent } from '@shared/domain/events/domain-event';

export class OnThisDayItemOpenedEvent extends DomainEvent {
  constructor(
    public readonly ownerId: string,
    public readonly kind: OnThisDayKind,
    public readonly itemId: string,
    public readonly openedAt: Date,
  ) {
    super();
  }
}
