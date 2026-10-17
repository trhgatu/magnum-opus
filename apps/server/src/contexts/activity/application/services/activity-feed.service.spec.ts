import {
  type ActivityProviderPort,
  ActivitySourceError,
} from '@shared/application/activity';
import { Result } from '@shared/domain/result';

import { ActivityFeed } from '../../domain/activity-feed.entity';
import { EnsureActivityFeedCommand } from '../commands/ensure-activity-feed.command';
import { ActivityFeedService } from './activity-feed.service';

describe('ActivityFeedService', () => {
  const github: jest.Mocked<ActivityProviderPort> = {
    provider: 'GITHUB',
    capabilities: { historyWindowDays: null },
    fetchEvents: jest.fn(),
    resolveResource: jest.fn(),
    connectedAccountId: jest.fn(),
  };
  const commandBus = { execute: jest.fn() };
  const service = new ActivityFeedService([github], commandBus as never);

  const input = {
    ownerId: 'owner-id',
    provider: 'GITHUB' as const,
    externalResourceId: '1067270000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    github.resolveResource.mockResolvedValue({
      externalAccountId: '127409189',
      displayName: 'trhgatu/magnum-opus',
    });
    commandBus.execute.mockResolvedValue(
      Result.ok(
        ActivityFeed.create({
          id: 'feed-id',
          ...input,
          externalAccountId: '127409189',
          displayName: 'trhgatu/magnum-opus',
          now: new Date(),
        }),
      ),
    );
  });

  it('ensures the feed under the connected account and returns its id', async () => {
    await expect(service.ensureFeed(input)).resolves.toBe('feed-id');

    expect(github.resolveResource).toHaveBeenCalledWith(
      'owner-id',
      '1067270000',
    );
    expect(commandBus.execute).toHaveBeenCalledWith(
      new EnsureActivityFeedCommand({
        ...input,
        externalAccountId: '127409189',
        displayName: 'trhgatu/magnum-opus',
      }),
    );
  });

  it('reads the connected account from the provider', async () => {
    github.connectedAccountId.mockResolvedValue('127409189');

    await expect(
      service.connectedAccountId({ ownerId: 'owner-id', provider: 'GITHUB' }),
    ).resolves.toBe('127409189');
  });

  it('creates nothing when the connection cannot read the resource', async () => {
    const failure = new ActivitySourceError('GITHUB_REPOSITORY_NOT_ACCESSIBLE');
    github.resolveResource.mockRejectedValue(failure);

    await expect(service.ensureFeed(input)).rejects.toBe(failure);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
