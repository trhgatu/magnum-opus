export const GITHUB_CONNECTION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
] as const;

export type GitHubConnectionStatus =
  (typeof GITHUB_CONNECTION_STATUSES)[number];

export interface GitHubConnectionResponse {
  accountLogin: string;
  status: GitHubConnectionStatus;
  expiresAt: string | null;
  lastVerifiedAt: string;
  connectedAt: string;
}

export interface GitHubRepositoryResponse {
  externalResourceId: string;
  fullName: string;
  isPrivate: boolean;
  pushedAt: string | null;
  usedByProjects: { id: string; title: string }[];
}

export interface GitHubRepositoryListResponse {
  repositories: GitHubRepositoryResponse[];
  truncated: boolean;
}
