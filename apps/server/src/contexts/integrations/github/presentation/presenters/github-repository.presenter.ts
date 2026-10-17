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
        // Client cảnh báo trước khi gắn một repository Project khác đang dùng.
        usedByProjects: (selection.usedByProjects[repository.id] ?? []).map(
          (project) => ({ ...project }),
        ),
      })),
      truncated: selection.truncated,
    };
  }
}
