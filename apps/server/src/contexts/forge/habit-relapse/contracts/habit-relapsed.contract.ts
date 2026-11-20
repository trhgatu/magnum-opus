import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const HabitRelapsed = defineIntegrationEvent(
  'forge.habit.relapsed.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    occurredOn: requireDate(payload, 'occurredOn'),
  }),
);
