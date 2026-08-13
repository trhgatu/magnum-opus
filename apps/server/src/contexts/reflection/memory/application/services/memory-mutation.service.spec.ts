import { MemoryState } from '../../domain/enums';
import {
  InvalidMemoryTransitionException,
  MemoryNotFoundException,
  MemoryRevisionConflictException,
} from '../../domain/exceptions';
import { Memory } from '../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../domain/value-objects';
import { MemoryMutationService } from './memory-mutation.service';

describe('MemoryMutationService', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const service = new MemoryMutationService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('returns not found for a Memory outside the owner scope', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (memory) => memory.moveToTrash(),
    });

    expect(result.getError()).toBeInstanceOf(MemoryNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before changing the aggregate', async () => {
    const memory = createMemory({ revision: 3 });
    repository.findByIdForOwner.mockResolvedValue(memory);

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 2,
      mutate: (current) => current.moveToTrash(),
    });

    expect(result.getError()).toBeInstanceOf(MemoryRevisionConflictException);
    expect(memory.state).toBe(MemoryState.ACTIVE);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('persists a successful mutation using the previous revision', async () => {
    const memory = createMemory();
    repository.findByIdForOwner.mockResolvedValue(memory);

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (current) => current.moveToTrash(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().state).toBe(MemoryState.TRASHED);
    expect(result.getValue().revision).toBe(2);
    expect(repository.update).toHaveBeenCalledWith(memory, 1);
  });

  it('detects a race during the atomic repository update', async () => {
    repository.findByIdForOwner.mockResolvedValue(createMemory());
    repository.update.mockResolvedValue(false);

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (memory) => memory.moveToTrash(),
    });

    expect(result.getError()).toBeInstanceOf(MemoryRevisionConflictException);
  });

  it('returns an invalid transition as a failed result', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createMemory({ state: MemoryState.TRASHED, trashedAt: new Date() }),
    );

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (memory) => memory.moveToTrash(),
    });

    expect(result.getError()).toBeInstanceOf(InvalidMemoryTransitionException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('skips persistence when normalized values are unchanged', async () => {
    const memory = createMemory();
    repository.findByIdForOwner.mockResolvedValue(memory);

    const result = await service.mutate({
      memoryId: 'memory-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (current) =>
        current.update({
          title: ' Memory ',
          content: ' Content ',
          occurredOn: MemoryOccurredOn.unknown(),
        }),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(1);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createMemory(
  overrides: Partial<{
    state: MemoryState;
    revision: number;
    trashedAt: Date | null;
  }> = {},
): Memory {
  return Memory.rehydrate({
    id: new MemoryId('memory-1'),
    ownerId: 'owner-1',
    sourceJournalEntryId: null,
    title: 'Memory',
    content: 'Content',
    occurredOn: MemoryOccurredOn.unknown(),
    state: overrides.state ?? MemoryState.ACTIVE,
    revision: overrides.revision ?? 1,
    trashedAt: overrides.trashedAt ?? null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
