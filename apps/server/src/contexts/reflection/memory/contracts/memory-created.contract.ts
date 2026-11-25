import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const MemoryCreated = defineIntegrationEvent(
  'reflection.memory.created.v1',
  (payload) => ({
    memoryId: requireString(payload, 'memoryId'),
    ownerId: requireString(payload, 'ownerId'),
    memoryOccurredOn:
      typeof payload.memoryOccurredOn === 'string'
        ? new Date(payload.memoryOccurredOn)
        : null,
    precision: typeof payload.precision === 'string' ? payload.precision : null,
  }),
);
