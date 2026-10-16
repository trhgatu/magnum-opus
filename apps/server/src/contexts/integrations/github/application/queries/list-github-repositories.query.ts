import { IQuery } from '@nestjs/cqrs';

export class ListGitHubRepositoriesQuery implements IQuery {
  public readonly ownerId: string;
  public readonly search: string | undefined;

  constructor(props: { ownerId: string; search?: string }) {
    this.ownerId = props.ownerId;
    this.search = props.search;
  }
}
