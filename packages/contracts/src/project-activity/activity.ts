export const ACTIVITY_PROVIDERS = ['GITHUB'] as const;
export type ActivityProvider = (typeof ACTIVITY_PROVIDERS)[number];

export const ACTIVITY_SOURCE_STATUSES = [
  'ACTIVE',
  'ERROR',
  'DISCONNECTED',
] as const;
export type ActivitySourceStatus = (typeof ACTIVITY_SOURCE_STATUSES)[number];

export const ACTIVITY_SOURCE_ERROR_CODES = [
  'GITHUB_TOKEN_EXPIRED',
  'GITHUB_TOKEN_REVOKED',
  'GITHUB_REPOSITORY_NOT_ACCESSIBLE',
  'GITHUB_ACCOUNT_CHANGED',
  'GITHUB_NOT_CONNECTED',
  'GITHUB_RATE_LIMITED',
  'GITHUB_UNAVAILABLE',
] as const;

export type ActivitySourceErrorCode =
  (typeof ACTIVITY_SOURCE_ERROR_CODES)[number];

export interface ActivitySourceResponse {
  feedId: string;
  provider: ActivityProvider;
  externalResourceId: string;
  displayName: string;
  status: ActivitySourceStatus;
  linkedAt: string;
  lastSyncAt: string | null;
  coveredFrom: string | null;
  syncedUntil: string | null;
  error: { code: ActivitySourceErrorCode } | null;
}

export const ACTIVITY_DAY_STATES = [
  'ACTIVE',
  'PAUSED_ACTIVE',
  'PAUSED_IDLE',
  'IDLE',
  'NO_DATA',
] as const;
export type ActivityDayState = (typeof ACTIVITY_DAY_STATES)[number];

export interface ActivityMetrics {
  activeDays: number;
  pausedActiveDays: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
}

export interface ActivityDay {
  date: string;
  state: ActivityDayState;
}

export interface CycleActivityResponse {
  cycleId: string;
  cycleNumber: number;
  startedAt: string;
  metrics: ActivityMetrics;
  lastActivityAt: string | null;
  days: ActivityDay[];
  hasMissingData: boolean;
  dataUntil: string | null;
}

export type Divergence =
  | { kind: 'PAUSED_WITH_ACTIVITY'; activeDays: number }
  | { kind: 'ACTIVE_WITHOUT_ACTIVITY'; idleDays: number }
  | {
      kind: 'ACTIVITY_AFTER_CLOSE';
      closedAs: 'STOPPED' | 'COMPLETED';
      commits: number;
      otherEvents: number;
      lastActivityAt: string;
    }
  | { kind: 'ACTIVITY_BEFORE_START'; lastActivityAt: string };

export type DivergenceKind = Divergence['kind'];

export interface ProjectActivityResponse {
  projectId: string;
  timeZone: string;
  sources: ActivitySourceResponse[];
  currentCycle: CycleActivityResponse | null;
  divergences: Divergence[];
}

export interface SnapshotSource {
  provider: ActivityProvider;
  displayName: string;
  coveredFrom: string | null;
  dataUntil: string | null;
}

export interface CycleActivitySnapshotResponse {
  cycleId: string;
  metrics: ActivityMetrics;
  lastActivityAt: string | null;
  days: ActivityDay[];
  sources: SnapshotSource[];
  timeZone: string;
  dataUntil: string | null;
  capturedAt: string;
}
