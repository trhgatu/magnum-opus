import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

const HABIT_TYPES = ['BUILD', 'QUIT'] as const;
type HabitTypeName = (typeof HABIT_TYPES)[number];

const isHabitType = (value: string): value is HabitTypeName =>
  (HABIT_TYPES as readonly string[]).includes(value);

export const HabitCreated = defineIntegrationEvent(
  'forge.habit.created.v1',
  (payload) => {
    const habitType = requireString(payload, 'habitType');
    if (!isHabitType(habitType)) {
      throw new Error(`Unknown habit type "${habitType}"`);
    }
    return {
      habitId: requireString(payload, 'habitId'),
      ownerId: requireString(payload, 'ownerId'),
      habitType,
      title: requireString(payload, 'title'),
      startedOn: requireDate(payload, 'startedOn'),
    };
  },
);
