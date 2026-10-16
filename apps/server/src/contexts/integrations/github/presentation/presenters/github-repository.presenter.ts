import type { GitHubRepositoryListResponse } from '@repo/contracts';

import type { GitHubRepositorySelection } from '../../application/queries/handlers/list-github-repositories.handler';

export class GitHubRepositoryPresenter {
  static toListResponse(
    selection: GitHubRepositorySelection,
  ): GitHubRepositoryListResponse {
    return {
      repositories: selection.repositories.map((repository) => ({
        externalResourceId: repository.id,
        fullName: repository.fullName,
        isPrivate: repository.isPrivate,
        pushedAt: repository.pushedAt?.toISOString() ?? null,
        // Liên kết Project ↔ nguồn thuộc tầng project-activity (PR5) — tầng
        // integrations không đọc ngược lên được. PR5 điền qua một reader port.
        usedByProjects: [],
      })),
      truncated: selection.truncated,
    };
  }
}
