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
      usedByProjects: {
        '1067270000': [{ id: 'project-id', title: 'Magnum Opus' }],
      },
    });

    expect(response).toEqual({
      repositories: [
        {
          externalResourceId: '1067270000',
          fullName: 'trhgatu/magnum-opus',
          isPrivate: true,
          pushedAt: '2026-10-15T08:00:00.000Z',
          usedByProjects: [{ id: 'project-id', title: 'Magnum Opus' }],
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
