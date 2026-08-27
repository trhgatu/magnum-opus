import { Routine } from '../../domain/routine.aggregate';

export const ROUTINE_READER = Symbol('ROUTINE_READER');

export type RoutineSortField = 'title' | 'createdAt' | 'updatedAt';

export interface RoutineDetailHabitReadModel {
  id: string;
  title: string;
  isActive: boolean;
  order: number;
}

export interface RoutineDetailReadModel {
  id: string;
  title: string;
  habits: RoutineDetailHabitReadModel[];
  isActive: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

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
  findByIdForOwner(
    routineId: string,
    ownerId: string,
  ): Promise<RoutineDetailReadModel | null>;

  findAllForOwner(
    ownerId: string,
    options: FindRoutinesOptions,
  ): Promise<FindRoutinesResult>;
}
