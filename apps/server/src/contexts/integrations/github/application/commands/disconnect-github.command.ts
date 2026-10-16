import { ICommand } from '@nestjs/cqrs';

export class DisconnectGitHubCommand implements ICommand {
  public readonly ownerId: string;
  constructor(props: { ownerId: string }) {
    this.ownerId = props.ownerId;
  }
}
