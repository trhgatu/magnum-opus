import type { LifecycleTransition } from '../../domain/declaration-timeline';

export const PROJECT_DECLARATION_READER = Symbol('PROJECT_DECLARATION_READER');

export interface ProjectCycleInfo {
  id: string;
  cycleNumber: number;
  startedAt: Date;
}

/** Lời tuyên bố của một Project: lịch sử chuyển trạng thái và các Cycle. */
export interface ProjectDeclaration {
  projectId: string;
  transitions: LifecycleTransition[];
  cycles: ProjectCycleInfo[];
}

/** Đọc Project qua bảng của module project — không bao giờ ghi. */
export interface ProjectDeclarationReader {
  /** null khi Project không có hoặc không thuộc owner. */
  read(ownerId: string, projectId: string): Promise<ProjectDeclaration | null>;
  exists(ownerId: string, projectId: string): Promise<boolean>;
}
