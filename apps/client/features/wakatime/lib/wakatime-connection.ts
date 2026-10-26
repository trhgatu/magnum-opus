import type { MutationError } from "@/lib/api";

const CONNECT_ERROR_COPY: Record<string, string> = {
  WAKATIME_KEY_INVALID:
    "WakaTime không chấp nhận API key này. Kiểm tra lại key rồi thử lại.",
  WAKATIME_UNAVAILABLE: "Chưa kết nối được tới WakaTime. Thử lại sau ít phút.",
  WAKATIME_RATE_LIMITED: "Chưa kết nối được tới WakaTime. Thử lại sau ít phút.",
};

export function connectErrorMessage(error: MutationError): string {
  return (error.code && CONNECT_ERROR_COPY[error.code]) ?? error.message;
}

export interface AccountChange {
  currentAccount: string;
  newAccount: string;
}

export function accountChangeOf(error: MutationError): AccountChange | null {
  if (error.code !== "WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED") return null;
  const currentAccount = error.args?.currentAccount;
  const newAccount = error.args?.newAccount;
  return typeof currentAccount === "string" && typeof newAccount === "string"
    ? { currentAccount, newAccount }
    : { currentAccount: "tài khoản hiện tại", newAccount: "tài khoản mới" };
}
