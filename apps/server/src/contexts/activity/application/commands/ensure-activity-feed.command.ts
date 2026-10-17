import { ICommand } from '@nestjs/cqrs';
import type { ActivityProvider } from '@repo/contracts';

export class EnsureActivityFeedCommand implements ICommand {
  public readonly ownerId: string;
  public readonly provider: ActivityProvider;
  public readonly externalAccountId: string;
  public readonly externalResourceId: string;
  /** Chỉ dùng khi tạo mới; feed đã có tự cập nhật tên ở lần chép sau. */

  public readonly displayName: string;
  constructor(props: {
    ownerId: string;
    provider: ActivityProvider;
    externalAccountId: string;
    externalResourceId: string;
    displayName: string;
  }) {
    this.ownerId = props.ownerId;
    this.provider = props.provider;
    this.externalAccountId = props.externalAccountId;
    this.externalResourceId = props.externalResourceId;
    this.displayName = props.displayName;
  }
}
