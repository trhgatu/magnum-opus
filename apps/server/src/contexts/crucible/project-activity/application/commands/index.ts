import { ICommand } from '@nestjs/cqrs';
import type { ActivityProvider } from '@repo/contracts';

export class LinkActivitySourceCommand implements ICommand {
  public readonly ownerId: string;
  public readonly projectId: string;
  public readonly provider: ActivityProvider;
  public readonly externalResourceId: string;

  constructor(props: {
    ownerId: string;
    projectId: string;
    provider: ActivityProvider;
    externalResourceId: string;
  }) {
    this.ownerId = props.ownerId;
    this.projectId = props.projectId;
    this.provider = props.provider;
    this.externalResourceId = props.externalResourceId;
  }
}

export class UnlinkActivitySourceCommand implements ICommand {
  public readonly ownerId: string;
  public readonly projectId: string;
  public readonly feedId: string;

  constructor(props: { ownerId: string; projectId: string; feedId: string }) {
    this.ownerId = props.ownerId;
    this.projectId = props.projectId;
    this.feedId = props.feedId;
  }
}
