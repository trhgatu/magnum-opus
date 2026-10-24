import { WakaTimeAccountChangeUnconfirmedException } from './exceptions';

export type WakaTimeConnectionStatus = 'ACTIVE' | 'REVOKED';

export interface WakaTimeAccount {
  /** id tài khoản WakaTime — dùng làm externalAccountId. */
  id: string;
  username: string;
}

export interface WakaTimeConnectionSnapshot {
  id: string;
  ownerId: string;
  account: WakaTimeAccount;
  encryptedKey: string;
  status: WakaTimeConnectionStatus;
  lastVerifiedAt: Date;
  createdAt: Date;
}

/**
 * Kết nối WakaTime của một tài khoản (BA 08 §5.1). API key không hết hạn,
 * nên khác GitHub: không có EXPIRED, chỉ ACTIVE hoặc REVOKED.
 */
export class WakaTimeConnection {
  private constructor(private props: WakaTimeConnectionSnapshot) {}

  static connect(input: {
    id: string;
    ownerId: string;
    account: WakaTimeAccount;
    encryptedKey: string;
    now: Date;
  }): WakaTimeConnection {
    return new WakaTimeConnection({
      id: input.id,
      ownerId: input.ownerId,
      account: { ...input.account },
      encryptedKey: input.encryptedKey,
      status: 'ACTIVE',
      lastVerifiedAt: new Date(input.now),
      createdAt: new Date(input.now),
    });
  }

  static rehydrate(snapshot: WakaTimeConnectionSnapshot): WakaTimeConnection {
    return new WakaTimeConnection(copySnapshot(snapshot));
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get account(): WakaTimeAccount {
    return { ...this.props.account };
  }

  get encryptedKey(): string {
    return this.props.encryptedKey;
  }

  get status(): WakaTimeConnectionStatus {
    return this.props.status;
  }

  get lastVerifiedAt(): Date {
    return new Date(this.props.lastVerifiedAt);
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  isUsable(): boolean {
    return this.props.status === 'ACTIVE';
  }

  /**
   * Thay key. Key của tài khoản WakaTime khác cần xác nhận: nguồn của tài
   * khoản cũ sẽ không chép tiếp được (`04` BR-PAC-008).
   */
  replaceKey(input: {
    account: WakaTimeAccount;
    encryptedKey: string;
    now: Date;
    confirmAccountChange: boolean;
  }): { accountChanged: boolean } {
    const accountChanged = input.account.id !== this.props.account.id;

    if (accountChanged && !input.confirmAccountChange) {
      throw new WakaTimeAccountChangeUnconfirmedException(
        this.props.account.username,
        input.account.username,
      );
    }
    this.props = {
      ...this.props,
      account: { ...input.account },
      encryptedKey: input.encryptedKey,
      status: 'ACTIVE',
      lastVerifiedAt: new Date(input.now),
    };

    return { accountChanged };
  }

  toSnapshot(): WakaTimeConnectionSnapshot {
    return copySnapshot(this.props);
  }
}

/** Bản sao sâu: Date là mutable, không được chia sẻ với bên ngoài entity. */
const copySnapshot = (
  snapshot: WakaTimeConnectionSnapshot,
): WakaTimeConnectionSnapshot => ({
  ...snapshot,
  account: { ...snapshot.account },
  lastVerifiedAt: new Date(snapshot.lastVerifiedAt),
  createdAt: new Date(snapshot.createdAt),
});
