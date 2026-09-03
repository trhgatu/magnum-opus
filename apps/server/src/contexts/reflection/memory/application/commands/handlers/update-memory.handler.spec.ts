import { Result } from '@shared/domain/result';

import { MemoryDatePrecision, MemoryState } from '../../../domain/enums';
import { Memory } from '../../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../../domain/value-objects';
import { MemoryMutationService } from '../../services';
import { UpdateMemoryCommand } from '../update-memory.command';
import { UpdateMemoryHandler } from './update-memory.handler';

describe('UpdateMemoryHandler', () => {
  const mutations = { mutate: jest.fn() };
  const handler = new UpdateMemoryHandler(mutations as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates to the mutation service with the command fields', async () => {
    mutations.mutate.mockResolvedValue(Result.ok(createMemory()));

    await handler.execute(
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

    const input = mutations.mutate.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 2,
    });
  });

  it('applies the rehydrated title, content and occurredOn through the mutate callback', async () => {
    let capturedMutate!: (memory: Memory) => void;
    mutations.mutate.mockImplementation(async (input) => {
      capturedMutate = input.mutate;
      return Result.ok(createMemory());
    });

    await handler.execute(
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

    const memory = createMemory();
    capturedMutate(memory);

    expect(memory.title).toBe('Updated title');
    expect(memory.content).toBe('Updated content');
    expect(
      memory.occurredOn.equals(
        MemoryOccurredOn.rehydrate('2026-08-10', MemoryDatePrecision.DAY),
      ),
    ).toBe(true);
  });
});

function createMemory(): Memory {
  return Memory.rehydrate({
    id: new MemoryId('memory-1'),
    ownerId: 'owner-1',
    sourceJournalEntryId: null,
    title: 'Original title',
    content: 'Original content',
    occurredOn: MemoryOccurredOn.unknown(),
    state: MemoryState.ACTIVE,
    revision: 2,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
