import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { DomainEvent } from '@shared/domain/events/domain-event';
import { getCorrelationId } from '@infrastructure/observability/correlation-context';

import type {
  IntegrationEvent,
  OutboxPayload,
} from '@shared/application/integration-event';
import {
  OutboxSerializer,
  type OutboxEventHandler,
  type OutboxPublication,
  type SerializedOutboxEvent,
} from './outbox-publication';
import { OutboxHandler, OutboxPublisher } from './outbox.decorators';

export interface PersistedOutboxEvent {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: Date;
}

export interface RegisteredOutboxHandler {
  event: IntegrationEvent<unknown>;
  handler: OutboxEventHandler<unknown>;
}

@Injectable()
export class OutboxRegistry implements OnModuleInit, OutboxSerializer {
  private readonly publications = new Map<
    OutboxPublication['event'],
    OutboxPublication
  >();
  private readonly events = new Map<string, IntegrationEvent<unknown>>();
  private readonly handlers = new Map<string, OutboxEventHandler<unknown>[]>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit(): void {
    const publications = this.discovery
      .getProviders({ metadataKey: OutboxPublisher.KEY })
      .flatMap(
        (wrapper) =>
          this.discovery.getMetadataByDecorator(OutboxPublisher, wrapper) ?? [],
      );
    const handlers = this.discovery
      .getProviders({ metadataKey: OutboxHandler.KEY })
      .map((wrapper) => {
        const event = this.discovery.getMetadataByDecorator(
          OutboxHandler,
          wrapper,
        );
        if (!event || !wrapper.instance) {
          throw new Error(
            `Outbox handler ${wrapper.name} must be a singleton with an event`,
          );
        }
        return {
          event,
          handler: wrapper.instance as OutboxEventHandler<unknown>,
        };
      });
    this.register(publications, handlers);
  }

  // Sai cấu hình thì app không khởi động được, thay vì làm rơi event lúc chạy.
  register(
    publications: OutboxPublication[],
    handlers: RegisteredOutboxHandler[],
  ): void {
    for (const publication of publications) {
      if (this.publications.has(publication.event)) {
        throw new Error(
          `${publication.event.name} is published to the outbox twice`,
        );
      }
      if (this.events.has(publication.as.type)) {
        throw new Error(
          `Outbox event type ${publication.as.type} is registered twice`,
        );
      }
      this.publications.set(publication.event, publication);
      for (const alias of publication.as.aliases) {
        if (this.events.has(alias)) {
          throw new Error(`Outbox event type ${alias} is registered twice`);
        }
        this.events.set(alias, publication.as);
      }
      this.events.set(publication.as.type, publication.as);
    }

    for (const { event, handler } of handlers) {
      if (!this.events.has(event.type)) {
        throw new Error(
          `${handler.constructor.name} handles ${event.type}, which nothing publishes`,
        );
      }
      this.handlers.set(event.type, [
        ...(this.handlers.get(event.type) ?? []),
        handler,
      ]);
    }

    // Duyệt theo publication: tên cũ (aliases) không có handler riêng.
    for (const { as } of this.publications.values()) {
      if (!this.handlers.has(as.type)) {
        throw new Error(`Outbox event type ${as.type} has no handler`);
      }
    }
  }

  // Gắn correlation ID của request đang chạy vào row outbox, để sau này lần
  // ngược được từ email/notification về đúng request đã sinh ra nó.
  serialize(event: DomainEvent): SerializedOutboxEvent {
    const publication = this.publications.get(
      event.constructor as OutboxPublication['event'],
    );
    if (!publication) {
      throw new Error(`Unsupported domain event: ${event.constructor.name}`);
    }
    return {
      id: event.eventId,
      type: publication.as.type,
      aggregateId: publication.aggregateId(event),
      payload: publication.toPayload(event),
      occurredAt: event.occurredOn,
      correlationId: getCorrelationId() ?? null,
    };
  }

  async dispatch(persisted: PersistedOutboxEvent): Promise<void> {
    const event = this.events.get(persisted.type);
    if (!event) {
      throw new Error(`Unsupported outbox event type: ${persisted.type}`);
    }
    const message = {
      eventId: persisted.id,
      occurredAt: persisted.occurredAt,
      payload: event.parse(asPayload(persisted.payload)),
    };
    // Tìm handler theo tên chuẩn: row có thể mang tên trong aliases.
    // allSettled: đợi mọi handler xong rồi mới báo lỗi, để lần retry không
    // chạy chồng lên handler còn đang chạy và lúc tắt app không bỏ dở handler.
    const results = await Promise.allSettled(
      (this.handlers.get(event.type) ?? []).map((handler) =>
        handler.handle(message),
      ),
    );
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure) {
      throw failure.reason;
    }
  }
}

const asPayload = (payload: unknown): OutboxPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Outbox event payload must be an object');
  }
  return payload as OutboxPayload;
};
