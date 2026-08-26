import { Routine } from '../../domain/routine.aggregate';

export const ROUTINE_READER = Symbol('ROUTINE_READER');

export type RoutineSortField = 'title' | 'createdAt' | 'updatedAt';

export interface FindRoutinesOptions {
  skip: number;
  take: number;
  isActive?: boolean;
  search?: string;
  sortBy?: RoutineSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface FindRoutinesResult {
  routines: Routine[];
  total: number;
}
export interface RoutineReader {
  findAllForOwner(
    ownerId: string,
    options: FindRoutinesOptions,
  ): Promise<FindRoutinesResult>;
}
