import { MemoryState } from '../../../domain/enums';
import { MemoryNotFoundException } from '../../../domain/exceptions';
import { Memory } from '../../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../../domain/value-objects';
import { GetMemoryQuery } from '../get-memory.query';
import { GetMemoryHandler } from './get-memory.handler';

describe('GetMemoryHandler', () => {
  const repository = { findByIdForOwner: jest.fn() };
  const handler = new GetMemoryHandler(repository as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns a Memory owned by the requesting user', async () => {
    const memory = createMemory();
    repository.findByIdForOwner.mockResolvedValue(memory);

    const result = await handler.execute(
      new GetMemoryQuery('memory-1', 'owner-1'),
    );

    expect(result.getValue()).toBe(memory);
    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'memory-1',
      'owner-1',
    );
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetMemoryQuery('memory-1', 'owner-2'),
    );

    expect(result.getError()).toBeInstanceOf(MemoryNotFoundException);
  });
});

function createMemory(): Memory {
  return Memory.rehydrate({
    id: new MemoryId('memory-1'),
    ownerId: 'owner-1',
    sourceJournalEntryId: null,
    title: 'Memory',
    content: 'Content',
    occurredOn: MemoryOccurredOn.unknown(),
    state: MemoryState.ACTIVE,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
