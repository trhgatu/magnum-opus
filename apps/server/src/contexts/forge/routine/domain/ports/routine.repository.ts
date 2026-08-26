import { Routine } from '../routine.aggregate';

export const ROUTINE_REPOSITORY = Symbol('ROUTINE_REPOSITORY');

export interface RoutineRepository {
  create(routine: Routine): Promise<void>;

  update(routine: Routine, expectedRevision: number): Promise<boolean>;

  findByIdForOwner(id: string, ownerId: string): Promise<Routine | null>;
}
