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
    const days: unknown = payload.frequencyDays;
    const isCanonical =
      Array.isArray(days) &&
      days.every(
        (day, index) =>
          Number.isInteger(day) &&
          day >= 1 &&
          day <= 7 &&
          (index === 0 || day > days[index - 1]),
      ) &&
      (frequencyType === 'DAILY' ? days.length === 0 : days.length > 0);
    if (!isCanonical) {
      throw new Error(
        `Outbox payload property "frequencyDays" does not fit a ${frequencyType} schedule`,
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
