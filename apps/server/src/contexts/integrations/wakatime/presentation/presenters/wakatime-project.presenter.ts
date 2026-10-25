import type { WakaTimeProjectResponse } from '@repo/contracts';

import type { WakaTimeProjectSelection } from '../../application/queries/handlers/list-wakatime-projects.handler';

export class WakaTimeProjectPresenter {
  static toListResponse(
    selection: WakaTimeProjectSelection,
  ): WakaTimeProjectResponse[] {
    return selection.projects.map((project) => ({
      id: project.id,
      name: project.name,
      lastHeartbeatAt: project.lastHeartbeatAt?.toISOString() ?? null,
      // Client cảnh báo trước khi gắn một project mà Project khác đang dùng.
      usedByProjects: (selection.usedByProjects[project.id] ?? []).map(
        (ref) => ({ ...ref }),
      ),
    }));
  }
}
