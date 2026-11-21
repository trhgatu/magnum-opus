import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

const FREQUENCY_TYPES = ['DAILY', 'WEEKLY'] as const;
type FrequencyTypeName = (typeof FREQUENCY_TYPES)[number];

const isFrequencyType = (value: string): value is FrequencyTypeName =>
  (FREQUENCY_TYPES as readonly string[]).includes(value);

export const HabitScheduleVersionStarted = defineIntegrationEvent(
  'forge.habit.schedule-version-started.v1',
  (payload) => {
    const frequencyType = requireString(payload, 'frequencyType');
    if (!isFrequencyType(frequencyType)) {
      throw new Error(`Unknown frequency type "${frequencyType}"`);
    }
    const days = payload.frequencyDays;
    if (
      !Array.isArray(days) ||
      !days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    ) {
      throw new Error(
        'Outbox payload property "frequencyDays" must be ISO weekdays',
      );
    }
    return {
      habitId: requireString(payload, 'habitId'),
      ownerId: requireString(payload, 'ownerId'),
      frequencyType,
      frequencyDays: days as number[],
      effectiveFrom: requireDate(payload, 'effectiveFrom'),
    };
  },
);
