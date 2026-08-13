import { MemoryState } from '../../../domain/enums';
import {
  MemoryNotFoundException,
  MemoryPermanentDeleteForbiddenException,
  MemoryRevisionConflictException,
} from '../../../domain/exceptions';
import { Memory } from '../../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../../domain/value-objects';
import { DeleteMemoryCommand } from '../delete-memory.command';
import { DeleteMemoryHandler } from './delete-memory.handler';

describe('DeleteMemoryHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    deletePermanently: jest.fn(),
  };
  const handler = new DeleteMemoryHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.deletePermanently.mockResolvedValue(true);
  });

  it('permanently deletes an owned trashed Memory at the expected revision', async () => {
    repository.findByIdForOwner.mockResolvedValue(createMemory());

    const result = await handler.execute(
      new DeleteMemoryCommand('memory-1', 'owner-1', 2),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.deletePermanently).toHaveBeenCalledWith(
      'memory-1',
      'owner-1',
      2,
    );
  });

  it('returns not found for an inaccessible Memory', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new DeleteMemoryCommand('memory-1', 'owner-2', 2),
    );

    expect(result.getError()).toBeInstanceOf(MemoryNotFoundException);
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('rejects permanent deletion outside Trash', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createMemory(MemoryState.ACTIVE),
    );

    const result = await handler.execute(
      new DeleteMemoryCommand('memory-1', 'owner-1', 2),
    );

    expect(result.getError()).toBeInstanceOf(
      MemoryPermanentDeleteForbiddenException,
    );
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('rejects a stale revision', async () => {
    repository.findByIdForOwner.mockResolvedValue(createMemory());

    const result = await handler.execute(
      new DeleteMemoryCommand('memory-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MemoryRevisionConflictException);
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('detects a race during the atomic delete', async () => {
    repository.findByIdForOwner.mockResolvedValue(createMemory());
    repository.deletePermanently.mockResolvedValue(false);

    const result = await handler.execute(
      new DeleteMemoryCommand('memory-1', 'owner-1', 2),
    );

    expect(result.getError()).toBeInstanceOf(MemoryRevisionConflictException);
  });
});

function createMemory(state: MemoryState = MemoryState.TRASHED): Memory {
  return Memory.rehydrate({
    id: new MemoryId('memory-1'),
    ownerId: 'owner-1',
    sourceJournalEntryId: null,
    title: 'Memory',
    content: 'Content',
    occurredOn: MemoryOccurredOn.unknown(),
    state,
    revision: 2,
    trashedAt:
      state === MemoryState.TRASHED
        ? new Date('2026-08-02T00:00:00.000Z')
        : null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  });
}
