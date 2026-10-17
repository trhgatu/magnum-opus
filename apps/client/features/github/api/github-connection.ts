import "server-only";

import type { GitHubConnectionResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

/** Kết nối GitHub của người dùng; null khi chưa kết nối (API trả 204). */
export async function getGitHubConnection(): Promise<GitHubConnectionResponse | null> {
  const connection = await apiFetch<GitHubConnectionResponse | undefined>(
    "/integrations/github",
  );
  return connection ?? null;
}
