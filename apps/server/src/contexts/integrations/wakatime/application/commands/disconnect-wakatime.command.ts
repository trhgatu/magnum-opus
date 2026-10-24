import { ICommand } from '@nestjs/cqrs';

export class DisconnectWakaTimeCommand implements ICommand {
  public readonly ownerId: string;
  constructor(props: { ownerId: string }) {
    this.ownerId = props.ownerId;
  }
}
