import { MemoryState } from '../enums';
import { Memory } from '../memory.aggregate';

export const MEMORY_REPOSITORY = Symbol('MEMORY_REPOSITORY');

export type MemorySortField = 'occurredOn' | 'createdAt' | 'updatedAt';

export type SortOrder = 'asc' | 'desc';

export interface FindMemoriesOptions {
  skip: number;
  take: number;
  state?: MemoryState;
  search?: string;
  sortBy?: MemorySortField;
  sortOrder?: SortOrder;
}

export interface FindMemoriesResult {
  memories: Memory[];
  total: number;
}

export interface MemoryRepository {
  create(memory: Memory): Promise<void>;

  update(memory: Memory, expectedRevision: number): Promise<boolean>;

  findByIdForOwner(id: string, ownerId: string): Promise<Memory | null>;

  findAllForOwner(
    ownerId: string,
    options: FindMemoriesOptions,
  ): Promise<FindMemoriesResult>;

  deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
