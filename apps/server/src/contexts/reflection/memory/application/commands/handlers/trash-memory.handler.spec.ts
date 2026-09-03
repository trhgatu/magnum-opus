import { Result } from '@shared/domain/result';

import { MemoryState } from '../../../domain/enums';
import { Memory } from '../../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../../domain/value-objects';
import { MemoryMutationService } from '../../services';
import { TrashMemoryCommand } from '../trash-memory.command';
import { TrashMemoryHandler } from './trash-memory.handler';

describe('TrashMemoryHandler', () => {
  const mutations = { mutate: jest.fn() };
  const handler = new TrashMemoryHandler(mutations as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates to the mutation service with the command fields', async () => {
    mutations.mutate.mockResolvedValue(Result.ok(createMemory()));

    await handler.execute(new TrashMemoryCommand('memory-1', 'owner-1', 2));

    const input = mutations.mutate.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 2,
    });
  });

  it('moves an active Memory to Trash through the mutate callback', async () => {
    let capturedMutate!: (memory: Memory) => void;
    mutations.mutate.mockImplementation(async (input) => {
      capturedMutate = input.mutate;
      return Result.ok(createMemory());
    });

    await handler.execute(new TrashMemoryCommand('memory-1', 'owner-1', 2));

    const memory = createMemory();
    capturedMutate(memory);

    expect(memory.state).toBe(MemoryState.TRASHED);
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
    revision: 2,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
