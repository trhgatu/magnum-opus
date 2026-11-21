import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const HabitRenamed = defineIntegrationEvent(
  'forge.habit.renamed.v1',
  (payload) => ({
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    title: requireString(payload, 'title'),
  }),
);
