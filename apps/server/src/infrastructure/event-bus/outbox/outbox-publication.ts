import type { Prisma } from '@repo/database';
import type { DomainEvent } from '@shared/domain/events/domain-event';
import type {
  IntegrationEvent,
  OutboxMessage,
} from '@shared/application/integration-event';

export interface OutboxEventHandler<P> {
  handle(message: OutboxMessage<P>): Promise<void>;
}

// Cách context phát dịch domain event nội bộ sang hợp đồng công khai.
export interface OutboxPublication<E extends DomainEvent = DomainEvent> {
  event: abstract new (...args: never[]) => E;
  as: IntegrationEvent<unknown>;
  aggregateId(event: E): string;
  toPayload(event: E): Prisma.InputJsonObject;
}

export interface SerializedOutboxEvent {
  id: string;
  type: string;
  aggregateId: string;
  payload: Prisma.InputJsonObject;
  occurredAt: Date;
  correlationId: string | null;
}

// Repository chỉ cần đúng việc này: biến domain event thành row outbox
// trong transaction của nó. Abstract class để Nest dùng làm token inject.
export abstract class OutboxSerializer {
  abstract serialize(event: DomainEvent): SerializedOutboxEvent;
}

export const publish = <E extends DomainEvent>(
  publication: OutboxPublication<E>,
): OutboxPublication<E> => publication;
