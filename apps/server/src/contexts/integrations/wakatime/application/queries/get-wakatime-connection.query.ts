import { IQuery } from '@nestjs/cqrs';

export class GetWakaTimeConnectionQuery implements IQuery {
  public readonly ownerId: string;
  constructor(props: { ownerId: string }) {
    this.ownerId = props.ownerId;
  }
}
