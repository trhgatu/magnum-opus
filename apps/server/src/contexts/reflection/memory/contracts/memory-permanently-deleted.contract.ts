import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const MemoryPermanentlyDeleted = defineIntegrationEvent(
  'reflection.memory.permanently-deleted.v1',
  (payload) => ({
    memoryId: requireString(payload, 'memoryId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
