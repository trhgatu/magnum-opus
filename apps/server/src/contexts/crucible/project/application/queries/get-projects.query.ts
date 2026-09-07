import { IQuery } from '@nestjs/cqrs';

import { ProjectLifecycleState } from '../../domain/enums';

export class GetProjectsQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly search?: string,
    public readonly state?: ProjectLifecycleState,
  ) {}
}
