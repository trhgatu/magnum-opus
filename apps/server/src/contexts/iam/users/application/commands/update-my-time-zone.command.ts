import { ICommand } from '@nestjs/cqrs';

export class UpdateMyTimeZoneCommand implements ICommand {
  public readonly userId: string;
  public readonly timeZone: string;

  constructor(props: { userId: string; timeZone: string }) {
    this.userId = props.userId;
    this.timeZone = props.timeZone;
  }
}
