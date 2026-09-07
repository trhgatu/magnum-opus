import { Project } from '../../domain/project.aggregate';
import { ProjectLifecycleState } from '../../domain/enums';

export const PROJECT_READER = Symbol('PROJECT_READER');

export interface FindProjectsOptions {
  skip: number;
  take: number;
  search?: string;
  state?: ProjectLifecycleState;
}

export interface FindProjectsResult {
  projects: Project[];
  total: number;
}

export interface ProjectReader {
  findAllForOwner(
    ownerId: string,
    options: FindProjectsOptions,
  ): Promise<FindProjectsResult>;
}
