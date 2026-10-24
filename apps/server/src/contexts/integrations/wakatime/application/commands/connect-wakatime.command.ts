import { ICommand } from '@nestjs/cqrs';

export class ConnectWakaTimeCommand implements ICommand {
  public readonly ownerId: string;
  public readonly apiKey: string;
  public readonly confirmAccountChange: boolean;

  constructor(props: {
    ownerId: string;
    apiKey: string;
    confirmAccountChange: boolean;
  }) {
    this.ownerId = props.ownerId;
    this.apiKey = props.apiKey;
    this.confirmAccountChange = props.confirmAccountChange;
  }
}
