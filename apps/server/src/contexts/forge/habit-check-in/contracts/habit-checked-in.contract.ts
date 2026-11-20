import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const HabitCheckedIn = defineIntegrationEvent(
  'forge.habit.checked-in.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    date: requireDate(payload, 'date'),
  }),
);
