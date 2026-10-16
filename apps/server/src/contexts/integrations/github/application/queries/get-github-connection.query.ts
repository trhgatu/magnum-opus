import { IQuery } from '@nestjs/cqrs';

export class GetGitHubConnectionQuery implements IQuery {
  public readonly ownerId: string;
  constructor(props: { ownerId: string }) {
    this.ownerId = props.ownerId;
  }
}
