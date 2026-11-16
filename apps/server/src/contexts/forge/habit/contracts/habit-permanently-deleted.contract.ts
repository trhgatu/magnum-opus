import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const HabitPermanentlyDeleted = defineIntegrationEvent(
  'forge.habit.permanently-deleted.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
