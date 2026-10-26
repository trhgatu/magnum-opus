import type { ActivityProvider } from '@repo/contracts';

import type { CalendarDay } from '../calendar-day';
import type {
  CycleActivityDay,
  CycleActivityMetrics,
} from '../services/summarize-cycle-activity';

export const CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY = Symbol(
  'CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY',
);

/** Một nguồn như lúc chụp: tên lúc đó và phần sổ nó đã có. */
export interface SnapshotSource {
  provider: ActivityProvider;
  displayName: string;
  coveredFrom: Date | null;
  dataUntil: Date | null;
}

/** Hoạt động của một Cycle, chép cứng lúc Cycle khép — không bao giờ đổi. */
export interface CycleActivitySnapshot {
  cycleId: string;
  metrics: CycleActivityMetrics;
  lastActivityAt: Date | null;
  days: CycleActivityDay[];
  sources: SnapshotSource[];
  timeZone: string;
  dataUntil: Date | null;
  capturedAt: Date;
}

export interface CycleActivitySnapshotRepository {
  exists(cycleId: string): Promise<boolean>;
  /** Tạo nếu Cycle chưa có snapshot; có rồi thì giữ nguyên, không lỗi. */
  createIfAbsent(snapshot: CycleActivitySnapshot): Promise<void>;
  /** Snapshot các Cycle của Project, mới chụp trước. */
  listByProject(
    ownerId: string,
    projectId: string,
  ): Promise<CycleActivitySnapshot[]>;
}
