import { Result } from '@shared/domain/result';

import {
  CreateMemoryCommand,
  DeleteMemoryCommand,
  RestoreMemoryCommand,
  TrashMemoryCommand,
  UpdateMemoryCommand,
} from '../../application/commands';
import { GetMemoriesQuery, GetMemoryQuery } from '../../application/queries';
import { MemoryDatePrecision, MemoryState } from '../../domain/enums';
import { Memory } from '../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../domain/value-objects';
import { MemoryController } from './memory.controller';

describe('MemoryController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new MemoryController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a Memory for the authenticated owner, not an owner from input', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createMemory()));

    const response = await controller.create('owner-1', {
      sourceJournalEntryId: null,
      title: 'A quiet afternoon',
      content: 'Light resting on the desk.',
      occurredOn: null,
      occurredOnPrecision: MemoryDatePrecision.UNKNOWN,
    });

    const command = commandBus.execute.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(CreateMemoryCommand);
    expect(command).toMatchObject({ ownerId: 'owner-1' });
    expect(response.id).toBe('memory-1');
    expect(response).not.toHaveProperty('ownerId');
  });

  it('maps list query pagination and returns metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({ memories: [createMemory()], total: 1 }),
    );

    const response = await controller.findAll('owner-1', {
      page: 1,
      limit: 10,
      state: MemoryState.ACTIVE,
      search: 'quiet',
      sortBy: 'occurredOn',
      sortOrder: 'desc',
    });

    const query = queryBus.execute.mock.calls[0]?.[0];
    expect(query).toBeInstanceOf(GetMemoriesQuery);
    expect(query).toMatchObject({
      ownerId: 'owner-1',
      page: 1,
      limit: 10,
      state: MemoryState.ACTIVE,
      search: 'quiet',
    });
    expect(response.meta).toEqual({
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 1,
    });
  });

  it('gets a single owned Memory', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(createMemory()));

    const response = await controller.findOne('owner-1', 'memory-1');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetMemoryQuery('memory-1', 'owner-1'),
    );
    expect(response.id).toBe('memory-1');
  });

  it('sends the expected revision and content when updating', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createMemory()));

    await controller.update('owner-1', 'memory-1', {
      expectedRevision: 2,
      title: 'Updated title',
      content: 'Updated content',
      occurredOn: '2026-08-10',
      occurredOnPrecision: MemoryDatePrecision.DAY,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateMemoryCommand(
        'memory-1',
        'owner-1',
        2,
        'Updated title',
        'Updated content',
        '2026-08-10',
        MemoryDatePrecision.DAY,
      ),
    );
  });

  it('sends the expected revision when trashing', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createMemory()));

    await controller.trash('owner-1', 'memory-1', { expectedRevision: 2 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new TrashMemoryCommand('memory-1', 'owner-1', 2),
    );
  });

  it('sends the expected revision when restoring', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createMemory()));

    await controller.restore('owner-1', 'memory-1', { expectedRevision: 3 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RestoreMemoryCommand('memory-1', 'owner-1', 3),
    );
  });

  it('permanently deletes without returning content', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    await controller.deletePermanently('owner-1', 'memory-1', {
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeleteMemoryCommand('memory-1', 'owner-1', 4),
    );
  });
});

function createMemory(): Memory {
  return Memory.rehydrate({
    id: new MemoryId('memory-1'),
    ownerId: 'owner-1',
    sourceJournalEntryId: null,
    title: 'A quiet afternoon',
    content: 'Light resting on the desk.',
    occurredOn: MemoryOccurredOn.unknown(),
    state: MemoryState.ACTIVE,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
