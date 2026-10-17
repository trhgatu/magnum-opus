import { IQuery } from '@nestjs/cqrs';

export class GetProjectActivityQuery implements IQuery {
  public readonly ownerId: string;
  public readonly projectId: string;

  constructor(props: { ownerId: string; projectId: string }) {
    this.ownerId = props.ownerId;
    this.projectId = props.projectId;
  }
}

export class ListActivitySourcesQuery implements IQuery {
  public readonly ownerId: string;
  public readonly projectId: string;

  constructor(props: { ownerId: string; projectId: string }) {
    this.ownerId = props.ownerId;
    this.projectId = props.projectId;
  }
}
