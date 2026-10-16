import { GitHubRepositoryPresenter } from './github-repository.presenter';

describe('GitHubRepositoryPresenter', () => {
  it('presents each repository with its GitHub id as the resource id', () => {
    const response = GitHubRepositoryPresenter.toListResponse({
      repositories: [
        {
          id: '1067270000',
          fullName: 'trhgatu/magnum-opus',
          isPrivate: true,
          pushedAt: new Date('2026-10-15T08:00:00.000Z'),
        },
        {
          id: '42',
          fullName: 'trhgatu/never-pushed',
          isPrivate: false,
          pushedAt: null,
        },
      ],
      truncated: true,
    });

    expect(response).toEqual({
      repositories: [
        {
          externalResourceId: '1067270000',
          fullName: 'trhgatu/magnum-opus',
          isPrivate: true,
          pushedAt: '2026-10-15T08:00:00.000Z',
          // Điền ở PR5, khi đã có liên kết Project ↔ nguồn.
          usedByProjects: [],
        },
        {
          externalResourceId: '42',
          fullName: 'trhgatu/never-pushed',
          isPrivate: false,
          pushedAt: null,
          usedByProjects: [],
        },
      ],
      truncated: true,
    });
  });
});
