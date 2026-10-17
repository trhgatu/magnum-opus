import type {
  ActivitySourceResponse,
  CycleActivityResponse,
  Divergence as DivergenceResponse,
  ProjectActivityResponse,
} from '@repo/contracts';

import type {
  ActivitySourceView,
  CycleActivityView,
  ProjectActivityView,
} from '../../application/views';
import type { Divergence } from '../../domain/services/detect-divergences';

const iso = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

export class ProjectActivityPresenter {
  static toSourceResponse(source: ActivitySourceView): ActivitySourceResponse {
    return {
      feedId: source.feedId,
      provider: source.provider,
      externalResourceId: source.externalResourceId,
      displayName: source.displayName,
      status: source.status,
      linkedAt: source.linkedAt.toISOString(),
      lastSyncAt: iso(source.lastSyncAt),
      coveredFrom: iso(source.coveredFrom),
      syncedUntil: iso(source.syncedUntil),
      // Mã ổn định; client chọn câu chữ. Không có message kỹ thuật từ nguồn.
      error: source.lastErrorCode ? { code: source.lastErrorCode } : null,
    };
  }

  static toResponse(view: ProjectActivityView): ProjectActivityResponse {
    return {
      projectId: view.projectId,
      timeZone: view.timeZone,
      sources: view.sources.map((source) =>
        ProjectActivityPresenter.toSourceResponse(source),
      ),
      currentCycle: view.currentCycle ? toCycle(view.currentCycle) : null,
      divergences: view.divergences.map(toDivergence),
    };
  }
}

function toCycle(cycle: CycleActivityView): CycleActivityResponse {
  return {
    cycleId: cycle.cycleId,
    cycleNumber: cycle.cycleNumber,
    startedAt: cycle.startedAt.toISOString(),
    metrics: { ...cycle.metrics },
    lastActivityAt: iso(cycle.lastActivityAt),
    days: cycle.days.map((day) => ({ ...day })),
    hasMissingData: cycle.hasMissingData,
    dataUntil: iso(cycle.dataUntil),
  };
}

function toDivergence(divergence: Divergence): DivergenceResponse {
  switch (divergence.kind) {
    case 'ACTIVITY_AFTER_CLOSE':
    case 'ACTIVITY_BEFORE_START':
      return {
        ...divergence,
        lastActivityAt: divergence.lastActivityAt.toISOString(),
      };
    default:
      return { ...divergence };
  }
}
