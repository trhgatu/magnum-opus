import { HttpStatus } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import {
  LinkActivitySourceCommand,
  UnlinkActivitySourceCommand,
} from '../../application/commands';
import {
  GetProjectActivityQuery,
  ListActivitySourcesQuery,
} from '../../application/queries';
import type { ActivitySourceView } from '../../application/views';
import { ProjectNotFoundException } from '../../domain/exceptions';
import { ProjectActivityController } from './project-activity.controller';

const source: ActivitySourceView = {
  feedId: 'feed-id',
  provider: 'GITHUB',
  externalResourceId: '1067270000',
  displayName: 'trhgatu/magnum-opus',
  status: 'ACTIVE',
  lastErrorCode: null,
  coveredFrom: null,
  syncedUntil: null,
  lastSyncAt: null,
  linkedAt: new Date('2026-10-02T00:00:00Z'),
};

describe('ProjectActivityController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new ProjectActivityController(
    commandBus as never,
    queryBus as never,
  );
  const response = () => ({ status: jest.fn() });

  beforeEach(() => jest.clearAllMocks());

  it('gets the activity of the owner’s project', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({
        projectId: 'project-id',
        timeZone: 'UTC',
        sources: [],
        currentCycle: null,
        divergences: [],
      }),
    );

    const body = await controller.getActivity('owner-id', 'project-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetProjectActivityQuery({
        ownerId: 'owner-id',
        projectId: 'project-id',
      }),
    );
    expect(body.sources).toEqual([]);
  });

  it('lists the sources', async () => {
    queryBus.execute.mockResolvedValue(Result.ok([source]));

    const body = await controller.listSources('owner-id', 'project-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new ListActivitySourcesQuery({
        ownerId: 'owner-id',
        projectId: 'project-id',
      }),
    );
    expect(body[0].feedId).toBe('feed-id');
  });

  it('answers 201 for a source linked now and 200 for one already linked', async () => {
    const res = response();
    commandBus.execute.mockResolvedValueOnce(
      Result.ok({ source, created: true }),
    );
    await controller.linkSource(
      'owner-id',
      'project-id',
      { provider: 'GITHUB', externalResourceId: '1067270000' },
      res as never,
    );
    expect(commandBus.execute).toHaveBeenCalledWith(
      new LinkActivitySourceCommand({
        ownerId: 'owner-id',
        projectId: 'project-id',
        provider: 'GITHUB',
        externalResourceId: '1067270000',
      }),
    );
    expect(res.status).toHaveBeenLastCalledWith(HttpStatus.CREATED);

    commandBus.execute.mockResolvedValueOnce(
      Result.ok({ source, created: false }),
    );
    await controller.linkSource(
      'owner-id',
      'project-id',
      { provider: 'GITHUB', externalResourceId: '1067270000' },
      res as never,
    );
    expect(res.status).toHaveBeenLastCalledWith(HttpStatus.OK);
  });

  it('unlinks a source', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    await expect(
      controller.unlinkSource('owner-id', 'project-id', 'feed-id'),
    ).resolves.toBeUndefined();
    expect(commandBus.execute).toHaveBeenCalledWith(
      new UnlinkActivitySourceCommand({
        ownerId: 'owner-id',
        projectId: 'project-id',
        feedId: 'feed-id',
      }),
    );
  });

  it('surfaces a domain failure instead of returning it', async () => {
    const failure = new ProjectNotFoundException('project-id');
    queryBus.execute.mockResolvedValue(Result.fail(failure));

    await expect(controller.getActivity('owner-id', 'project-id')).rejects.toBe(
      failure,
    );
  });
});
