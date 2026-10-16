import { GitHubAccountChangeUnconfirmedException } from './exceptions';

export type GitHubConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

type StoredStatus = 'ACTIVE' | 'REVOKED';

export interface GitHubAccount {
  id: string;
  nodeId: string;
  login: string;
}

export interface GitHubConnectionSnapshot {
  id: string;
  ownerId: string;
  account: GitHubAccount;
  encryptedToken: string;
  status: StoredStatus;
  expiresAt: Date | null;
  lastVerifiedAt: Date;
  createdAt: Date;
}

export class GitHubConnection {
  private constructor(private props: GitHubConnectionSnapshot) {}

  static connect(input: {
    id: string;
    ownerId: string;
    account: GitHubAccount;
    encryptedToken: string;
    expiresAt: Date | null;
    now: Date;
  }): GitHubConnection {
    return new GitHubConnection({
      id: input.id,
      ownerId: input.ownerId,
      account: { ...input.account },
      encryptedToken: input.encryptedToken,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      lastVerifiedAt: input.now,
      createdAt: input.now,
    });
  }

  static rehydrate(snapshot: GitHubConnectionSnapshot): GitHubConnection {
    return new GitHubConnection({
      ...snapshot,
      account: { ...snapshot.account },
    });
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get account(): GitHubAccount {
    return { ...this.props.account };
  }

  get encryptedToken(): string {
    return this.props.encryptedToken;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  get lastVerifiedAt(): Date {
    return this.props.lastVerifiedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  statusAt(now: Date): GitHubConnectionStatus {
    if (this.props.status === 'REVOKED') return 'REVOKED';
    if (this.props.expiresAt && this.props.expiresAt <= now) return 'EXPIRED';
    return 'ACTIVE';
  }

  isUsableAt(now: Date): boolean {
    return this.statusAt(now) === 'ACTIVE';
  }

  markRevoked(): void {
    this.props.status = 'REVOKED';
  }

  replaceToken(input: {
    account: GitHubAccount;
    encryptedToken: string;
    expiresAt: Date | null;
    now: Date;
    confirmAccountChange: boolean;
  }): { accountChanged: boolean } {
    const accountChanged = input.account.id !== this.props.account.id;

    if (accountChanged && !input.confirmAccountChange) {
      throw new GitHubAccountChangeUnconfirmedException(
        this.props.account.login,
        input.account.login,
      );
    }
    this.props = {
      ...this.props,
      account: { ...input.account },
      encryptedToken: input.encryptedToken,
      status: 'ACTIVE',
      expiresAt: input.expiresAt,
      lastVerifiedAt: input.now,
    };

    return { accountChanged };
  }

  toSnapshot(): GitHubConnectionSnapshot {
    return {
      ...this.props,
      account: { ...this.props.account },
    };
  }
}
