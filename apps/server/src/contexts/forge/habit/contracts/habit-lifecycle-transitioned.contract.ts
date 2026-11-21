import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

const ACTIONS = ['ARCHIVED', 'RESTORED'] as const;
type ActionName = (typeof ACTIONS)[number];

const isAction = (value: string): value is ActionName =>
  (ACTIONS as readonly string[]).includes(value);

export const HabitLifecycleTransitioned = defineIntegrationEvent(
  'forge.habit.lifecycle-transitioned.v1',
  (payload) => {
    const action = requireString(payload, 'action');
    if (!isAction(action)) {
      throw new Error(`Unknown lifecycle action "${action}"`);
    }
    return {
      habitId: requireString(payload, 'habitId'),
      ownerId: requireString(payload, 'ownerId'),
      action,
      effectiveOn: requireDate(payload, 'effectiveOn'),
    };
  },
);
