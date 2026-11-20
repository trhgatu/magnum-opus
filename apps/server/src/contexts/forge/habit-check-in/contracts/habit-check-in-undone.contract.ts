import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const HabitCheckInUndone = defineIntegrationEvent(
  'forge.habit.check-in-undone.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    date: requireDate(payload, 'date'),
  }),
);
