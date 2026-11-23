import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const RoutineHabitAdded = defineIntegrationEvent(
  'forge.routine.habit-added.v1',
  (payload) => ({
    routineId: requireString(payload, 'routineId'),
    habitId: requireString(payload, 'habitId'),
    ownerId: requireString(payload, 'ownerId'),
    routineTitle: requireString(payload, 'routineTitle'),
  }),
);
