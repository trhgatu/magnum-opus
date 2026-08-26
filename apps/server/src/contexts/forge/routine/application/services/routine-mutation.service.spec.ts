import {
  InvalidRoutineTransitionException,
  RoutineNotFoundException,
  RoutineRevisionConflictException,
} from '../../domain/exceptions';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';
import { RoutineMutationService } from './routine-mutation.service';

describe('RoutineMutationService', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const service = new RoutineMutationService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('loads by owner, mutates and persists at the expected revision', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (current) => current.archive(),
    });

    expect(result.getValue().isActive).toBe(false);

    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'routine-id',
      'owner-id',
    );

    expect(repository.update).toHaveBeenCalledWith(routine, 1);
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'different-owner',
      expectedRevision: 1,
      mutate: (routine) => routine.archive(),
    });

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutating', async () => {
    const routine = createRoutine(3);
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      expectedRevision: 2,
      mutate: (current) => current.archive(),
    });

    expect(result.getError()).toBeInstanceOf(RoutineRevisionConflictException);

    expect(routine.isActive).toBe(true);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a domain transition error without writing', async () => {
    const routine = createRoutine();
    routine.archive();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      expectedRevision: 2,
      mutate: (current) => current.archive(),
    });

    expect(result.getError()).toBeInstanceOf(InvalidRoutineTransitionException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not write when the aggregate did not change', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (current) => current.updateTitle('Morning ritual'),
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('detects a race after the aggregate was loaded', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());
    repository.update.mockResolvedValue(false);

    const result = await service.mutate({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (routine) => routine.archive(),
    });

    expect(result.getError()).toBeInstanceOf(RoutineRevisionConflictException);
  });
});

function createRoutine(revision = 1): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-id'],
    isActive: true,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
