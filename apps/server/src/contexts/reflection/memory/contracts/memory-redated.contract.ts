import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const MemoryRedated = defineIntegrationEvent(
  'reflection.memory.redated.v1',
  (payload) => ({
    memoryId: requireString(payload, 'memoryId'),
    ownerId: requireString(payload, 'ownerId'),
    memoryOccurredOn:
      typeof payload.memoryOccurredOn === 'string'
        ? new Date(payload.memoryOccurredOn)
        : null,
    precision: requireString(payload, 'precision'),
  }),
);
