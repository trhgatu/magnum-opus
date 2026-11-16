import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

const CYCLE_END_REASONS = ['STOPPED', 'COMPLETED'] as const;
type CycleEndReason = (typeof CYCLE_END_REASONS)[number];

const isCycleEndReason = (value: string): value is CycleEndReason =>
  (CYCLE_END_REASONS as readonly string[]).includes(value);

export const ProjectCycleClosed = defineIntegrationEvent(
  'crucible.project.cycle-closed.v1',
  (payload) => {
    const endReason = requireString(payload, 'endReason');
    if (!isCycleEndReason(endReason)) {
      throw new Error(`Unknown cycle end reason "${endReason}"`);
    }
    return {
      projectId: requireString(payload, 'projectId'),
      ownerId: requireString(payload, 'ownerId'),
      cycleId: requireString(payload, 'cycleId'),
      endReason,
      closedAt: requireDate(payload, 'closedAt'),
    };
  },
);
