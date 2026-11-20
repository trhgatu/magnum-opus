import {
  defineIntegrationEvent,
  requireString,
  requireDate,
} from '@shared/application/integration-event';

export const HabitQuitStartChanged = defineIntegrationEvent(
  'forge.habit.quit-start-changed.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    startedOn: requireDate(payload, 'startedOn'),
  }),
);
