export const PROJECT_LIFECYCLE_STATES = [
  'NOT_STARTED',
  'ACTIVE',
  'PAUSED',
  'STOPPED',
  'COMPLETED',
] as const;

export type ProjectLifecycleState = (typeof PROJECT_LIFECYCLE_STATES)[number];

export const PROJECT_CYCLE_END_REASONS = ['STOPPED', 'COMPLETED'] as const;

export type ProjectCycleEndReason = (typeof PROJECT_CYCLE_END_REASONS)[number];

export interface ProjectCycleResponse {
  id: string;
  cycleNumber: number;
  intendedOutcome: string | null;
  startedAt: string;
  endedAt: string | null;
  endReason: ProjectCycleEndReason | null;
}

export interface ProjectResponse {
  id: string;
  title: string;
  description: string | null;
  lifecycleState: ProjectLifecycleState;
  currentCycle: ProjectCycleResponse | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
