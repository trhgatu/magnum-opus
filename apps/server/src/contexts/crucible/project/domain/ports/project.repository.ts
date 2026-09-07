import { Project } from '../project.aggregate';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface ProjectRepository {
  create(project: Project): Promise<void>;

  update(project: Project, expectedRevision: number): Promise<boolean>;

  findByIdForOwner(id: string, ownerId: string): Promise<Project | null>;

  deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
