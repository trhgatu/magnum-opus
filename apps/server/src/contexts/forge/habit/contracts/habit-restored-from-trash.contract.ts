import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const HabitRestoredFromTrash = defineIntegrationEvent(
  'forge.habit.restored-from-trash.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
