import { DiscoveryService } from '@nestjs/core';

import type { IntegrationEvent } from '@shared/application/integration-event';
import type { OutboxPublication } from './outbox-publication';

export const OutboxHandler =
  DiscoveryService.createDecorator<IntegrationEvent<unknown>>();

export const OutboxPublisher =
  DiscoveryService.createDecorator<OutboxPublication[]>();
