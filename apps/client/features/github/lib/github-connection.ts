import type { GitHubConnectionResponse } from "@repo/contracts";

import type { MutationError } from "@/lib/api";

const DAY_MS = 86_400_000;
/** Nhắc thay token khi còn chừng này ngày (06 §6.1). */
export const EXPIRY_REMINDER_DAYS = 14;

export type ConnectionHealth =
  | { kind: "active"; expiresAt: string | null }
  | { kind: "expiring"; expiresAt: string; daysLeft: number }
  | { kind: "expired" }
  | { kind: "revoked" };

/** Trạng thái hiển thị của kết nối tại một thời điểm (06 §6.1). */
export function connectionHealth(
  connection: GitHubConnectionResponse,
  now: Date,
): ConnectionHealth {
  if (connection.status === "REVOKED") return { kind: "revoked" };
  if (connection.status === "EXPIRED") return { kind: "expired" };

  const { expiresAt } = connection;
  if (expiresAt === null) return { kind: "active", expiresAt: null };

  const msLeft = Date.parse(expiresAt) - now.getTime();
  // Server tính trạng thái lúc trả về; trang mở lâu thì tự chuyển sang hết hạn.
  if (msLeft <= 0) return { kind: "expired" };

  const daysLeft = Math.ceil(msLeft / DAY_MS);
  return daysLeft <= EXPIRY_REMINDER_DAYS
    ? { kind: "expiring", expiresAt, daysLeft }
    : { kind: "active", expiresAt };
}

/**
 * Lúc trạng thái hiển thị đổi tiếp (bắt đầu nhắc, hoặc hết hạn) — để trang
 * mở lâu tự cập nhật. null khi không còn mốc nào phía trước.
 */
export function nextHealthChangeAt(
  connection: GitHubConnectionResponse,
  now: Date,
): Date | null {
  if (connection.status !== "ACTIVE" || connection.expiresAt === null) {
    return null;
  }
  const expiry = Date.parse(connection.expiresAt);
  const remindFrom = expiry - EXPIRY_REMINDER_DAYS * DAY_MS;
  const next = [remindFrom, expiry].find((time) => time > now.getTime());
  return next === undefined ? null : new Date(next);
}

const CONNECT_ERROR_COPY: Record<string, string> = {
  GITHUB_TOKEN_INVALID:
    "GitHub không chấp nhận token này. Kiểm tra lại token rồi thử lại.",
  GITHUB_TOKEN_INSUFFICIENT_SCOPE:
    "Token thiếu quyền đọc. Cần Contents và Pull requests ở mức Read-only.",
  GITHUB_UNAVAILABLE: "Chưa kết nối được tới GitHub. Thử lại sau ít phút.",
  GITHUB_RATE_LIMITED: "Chưa kết nối được tới GitHub. Thử lại sau ít phút.",
};

/** Câu chữ của lỗi khi kết nối (06 §6.4); lỗi khác dùng câu chung của API. */
export function connectErrorMessage(error: MutationError): string {
  return (error.code && CONNECT_ERROR_COPY[error.code]) ?? error.message;
}

export interface AccountChange {
  currentAccount: string;
  newAccount: string;
}

/** Token thuộc tài khoản khác: cần người dùng xác nhận trước khi thay. */
export function accountChangeOf(error: MutationError): AccountChange | null {
  if (error.code !== "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED") return null;
  const currentAccount = error.args?.currentAccount;
  const newAccount = error.args?.newAccount;
  return typeof currentAccount === "string" && typeof newAccount === "string"
    ? { currentAccount, newAccount }
    : { currentAccount: "tài khoản hiện tại", newAccount: "tài khoản mới" };
}
