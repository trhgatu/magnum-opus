import type {
  ActivitySourceErrorCode,
  ActivitySourceResponse,
} from "@repo/contracts";

import type { MutationError } from "@/lib/api";

/** Câu chữ lỗi của một nguồn, đi kèm tên nguồn (06 §12). */
const SOURCE_ERROR_COPY: Record<ActivitySourceErrorCode, string> = {
  GITHUB_TOKEN_EXPIRED: "token đã hết hạn — cập nhật ở Cài đặt.",
  GITHUB_TOKEN_REVOKED: "GitHub đã thu hồi token — cập nhật ở Cài đặt.",
  GITHUB_REPOSITORY_NOT_ACCESSIBLE:
    "không đọc được repository — kiểm tra quyền của token hoặc repository.",
  GITHUB_ACCOUNT_CHANGED: "ngừng cập nhật — đã gắn bằng tài khoản GitHub khác.",
  GITHUB_NOT_CONNECTED: "ngừng cập nhật — đã gắn bằng tài khoản GitHub khác.",
  GITHUB_RATE_LIMITED:
    "GitHub tạm giới hạn truy cập — sẽ thử lại khi bạn mở lại trang.",
  GITHUB_UNAVAILABLE: "chưa cập nhật được — sẽ thử lại khi bạn mở lại trang.",
  WAKATIME_NOT_CONNECTED: "WakaTime chưa được kết nối — kết nối ở Cài đặt.",
  WAKATIME_KEY_INVALID:
    "API key WakaTime không còn dùng được — cập nhật ở Cài đặt.",
  WAKATIME_ACCOUNT_CHANGED:
    "ngừng cập nhật — đã gắn bằng tài khoản WakaTime khác.",
  WAKATIME_PROJECT_NOT_FOUND: "không còn thấy project này trên WakaTime.",
  WAKATIME_RATE_LIMITED:
    "WakaTime tạm giới hạn truy cập — sẽ thử lại khi bạn mở lại trang.",
  WAKATIME_UNAVAILABLE: "chưa cập nhật được — sẽ thử lại khi bạn mở lại trang.",
};

export function sourceErrorCopy(code: ActivitySourceErrorCode): string {
  return SOURCE_ERROR_COPY[code];
}

export interface SourceLine {
  label: "Đang cập nhật" | "Lỗi" | "Ngừng cập nhật";
  detail: string;
}

/**
 * Nhãn và dòng phụ của một nguồn (06 §7.2). Có lỗi thì dòng phụ luôn là câu
 * của mã lỗi, bất kể trạng thái — vd vẫn ACTIVE nhưng vừa bị giới hạn request.
 */
export function sourceLine(
  source: ActivitySourceResponse,
  timeZone: string,
  now: Date,
): SourceLine {
  const label =
    source.status === "ACTIVE"
      ? "Đang cập nhật"
      : source.status === "ERROR"
        ? "Lỗi"
        : "Ngừng cập nhật";

  if (source.error) {
    const updated = source.lastSyncAt
      ? ` Cập nhật gần nhất ${formatUpdatedAt(source.lastSyncAt, timeZone, now)}.`
      : "";
    return {
      label,
      detail: capitalize(sourceErrorCopy(source.error.code)) + updated,
    };
  }

  if (source.status === "DISCONNECTED") {
    return {
      label,
      detail: "Đã gắn bằng tài khoản khác hoặc đã ngắt kết nối GitHub.",
    };
  }

  return {
    label,
    detail: source.lastSyncAt
      ? `Cập nhật lúc ${formatUpdatedAt(source.lastSyncAt, timeZone, now)}`
      : "Chưa cập nhật lần nào",
  };
}

/** "14:32" nếu là hôm nay theo múi giờ tài khoản, "12/10/2026" nếu không. */
export function formatUpdatedAt(
  iso: string,
  timeZone: string,
  now: Date,
): string {
  const at = new Date(iso);
  const day = (date: Date) =>
    new Intl.DateTimeFormat("vi-VN", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

  if (day(at) !== day(now)) return day(at);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

const LINK_ERROR_COPY: Record<string, string> = {
  GITHUB_NOT_CONNECTED:
    "Kết nối GitHub không còn dùng được — cập nhật token ở Cài đặt.",
  GITHUB_REPOSITORY_NOT_ACCESSIBLE:
    "Không đọc được repository này — kiểm tra quyền của token.",
  GITHUB_RATE_LIMITED:
    "GitHub đang tạm giới hạn truy cập. Thử lại sau ít phút.",
  GITHUB_UNAVAILABLE: "Chưa kết nối được tới GitHub. Thử lại sau ít phút.",
};

/** Câu chữ khi gắn hoặc tìm repository thất bại; lỗi khác dùng câu chung. */
export function linkErrorMessage(error: MutationError): string {
  return (error.code && LINK_ERROR_COPY[error.code]) ?? error.message;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
