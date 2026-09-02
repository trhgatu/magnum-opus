import { Result } from '@shared/domain/result';

import { MemoryState } from '../../../domain/enums';
import { Memory } from '../../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../../domain/value-objects';
import { MemoryMutationService } from '../../services';
import { RestoreMemoryCommand } from '../restore-memory.command';
import { RestoreMemoryHandler } from './restore-memory.handler';

describe('RestoreMemoryHandler', () => {
  const mutations = { mutate: jest.fn() };
  const handler = new RestoreMemoryHandler(mutations as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates to the mutation service with the command fields', async () => {
    mutations.mutate.mockResolvedValue(Result.ok(createMemory()));

    await handler.execute(new RestoreMemoryCommand('memory-1', 'owner-1', 3));

    const input = mutations.mutate.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 3,
    });
  });

  it('restores a trashed Memory to active through the mutate callback', async () => {
    let capturedMutate!: (memory: Memory) => void;
    mutations.mutate.mockImplementation(async (input) => {
      capturedMutate = input.mutate;
      return Result.ok(createMemory());
    });

    await handler.execute(new RestoreMemoryCommand('memory-1', 'owner-1', 3));

    const memory = createMemory();
    capturedMutate(memory);

    expect(memory.state).toBe(MemoryState.ACTIVE);
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
    state: MemoryState.TRASHED,
    revision: 3,
    trashedAt: new Date('2026-08-02T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  });
}
