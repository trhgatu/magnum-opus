import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const MemoryTrashed = defineIntegrationEvent(
  'reflection.memory.trashed.v1',
  (payload) => ({
    memoryId: requireString(payload, 'memoryId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
