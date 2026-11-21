import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const HabitTrashed = defineIntegrationEvent(
  'forge.habit.trashed.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
  }),
);
