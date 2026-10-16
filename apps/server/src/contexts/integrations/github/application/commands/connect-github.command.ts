import { ICommand } from '@nestjs/cqrs';

export class ConnectGitHubCommand implements ICommand {
  public readonly ownerId: string;
  public readonly token: string;
  public readonly confirmAccountChange: boolean;

  constructor(props: {
    ownerId: string;
    token: string;
    confirmAccountChange: boolean;
  }) {
    this.ownerId = props.ownerId;
    this.token = props.token;
    this.confirmAccountChange = props.confirmAccountChange;
  }
}
