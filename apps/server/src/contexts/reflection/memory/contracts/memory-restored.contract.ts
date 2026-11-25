import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const MemoryRestored = defineIntegrationEvent(
  'reflection.memory.restored.v1',
  (payload) => ({
    memoryId: requireString(payload, 'memoryId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
