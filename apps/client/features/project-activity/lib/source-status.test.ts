import {
  ACTIVITY_SOURCE_ERROR_CODES,
  type ActivitySourceResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  formatUpdatedAt,
  linkErrorMessage,
  sourceErrorCopy,
  sourceLine,
} from "./source-status";

const NOW = new Date("2026-10-18T10:00:00.000Z");

const source = (
  overrides: Partial<ActivitySourceResponse> = {},
): ActivitySourceResponse => ({
  feedId: "feed-id",
  provider: "GITHUB",
  externalResourceId: "1067270000",
  displayName: "trhgatu/magnum-opus",
  status: "ACTIVE",
  linkedAt: "2026-10-01T00:00:00.000Z",
  lastSyncAt: "2026-10-18T07:32:00.000Z",
  coveredFrom: "2026-09-24T00:00:00.000Z",
  syncedUntil: "2026-10-18T07:32:00.000Z",
  error: null,
  ...overrides,
});

describe("sourceLine", () => {
  it("shows when an active source was last updated", () => {
    expect(sourceLine(source(), "Asia/Ho_Chi_Minh", NOW)).toEqual({
      label: "Đang cập nhật",
      detail: "Cập nhật lúc 14:32",
    });
  });

  it("shows the date for an update that was not today", () => {
    expect(
      sourceLine(source({ lastSyncAt: "2026-10-12T07:32:00.000Z" }), "UTC", NOW)
        .detail,
    ).toBe("Cập nhật lúc 12/10/2026");
  });

  it("puts the error copy first whatever the status", () => {
    expect(
      sourceLine(
        source({ error: { code: "GITHUB_RATE_LIMITED" } }),
        "Asia/Ho_Chi_Minh",
        NOW,
      ),
    ).toEqual({
      label: "Đang cập nhật",
      detail:
        "GitHub tạm giới hạn truy cập — sẽ thử lại khi bạn mở lại trang. Cập nhật gần nhất 14:32.",
    });
    expect(
      sourceLine(
        source({
          status: "ERROR",
          lastSyncAt: null,
          error: { code: "GITHUB_REPOSITORY_NOT_ACCESSIBLE" },
        }),
        "UTC",
        NOW,
      ),
    ).toEqual({
      label: "Lỗi",
      detail:
        "Không đọc được repository — kiểm tra quyền của token hoặc repository.",
    });
  });

  it("explains a source that stopped updating without an error code", () => {
    expect(sourceLine(source({ status: "DISCONNECTED" }), "UTC", NOW)).toEqual({
      label: "Ngừng cập nhật",
      detail: "Đã gắn bằng tài khoản khác hoặc đã ngắt kết nối GitHub.",
    });
  });

  it("names the provider of a source that stopped updating", () => {
    expect(
      sourceLine(
        source({ provider: "WAKATIME", status: "DISCONNECTED" }),
        "UTC",
        NOW,
      ).detail,
    ).toBe("Đã gắn bằng tài khoản khác hoặc đã ngắt kết nối WakaTime.");
  });

  it("says a source was never updated", () => {
    expect(sourceLine(source({ lastSyncAt: null }), "UTC", NOW).detail).toBe(
      "Chưa cập nhật lần nào",
    );
  });
});

describe("sourceErrorCopy", () => {
  it.each([
    ["GITHUB_TOKEN_EXPIRED", "token đã hết hạn — cập nhật ở Cài đặt."],
    ["GITHUB_TOKEN_REVOKED", "GitHub đã thu hồi token — cập nhật ở Cài đặt."],
    [
      "GITHUB_REPOSITORY_NOT_ACCESSIBLE",
      "không đọc được repository — kiểm tra quyền của token hoặc repository.",
    ],
    [
      "GITHUB_ACCOUNT_CHANGED",
      "ngừng cập nhật — đã gắn bằng tài khoản GitHub khác.",
    ],
    [
      "GITHUB_NOT_CONNECTED",
      "ngừng cập nhật — đã gắn bằng tài khoản GitHub khác.",
    ],
    [
      "GITHUB_RATE_LIMITED",
      "GitHub tạm giới hạn truy cập — sẽ thử lại khi bạn mở lại trang.",
    ],
    [
      "GITHUB_UNAVAILABLE",
      "chưa cập nhật được — sẽ thử lại khi bạn mở lại trang.",
    ],
    [
      "WAKATIME_KEY_INVALID",
      "API key WakaTime không còn dùng được — cập nhật ở Cài đặt.",
    ],
    [
      "WAKATIME_NOT_CONNECTED",
      "WakaTime chưa được kết nối — kết nối ở Cài đặt.",
    ],
    [
      "WAKATIME_ACCOUNT_CHANGED",
      "ngừng cập nhật — đã gắn bằng tài khoản WakaTime khác.",
    ],
    ["WAKATIME_PROJECT_NOT_FOUND", "không còn thấy project này trên WakaTime."],
    [
      "WAKATIME_RATE_LIMITED",
      "WakaTime tạm giới hạn truy cập — sẽ thử lại khi bạn mở lại trang.",
    ],
    [
      "WAKATIME_UNAVAILABLE",
      "chưa cập nhật được — sẽ thử lại khi bạn mở lại trang.",
    ],
  ] as const)("uses the BA copy for %s", (code, copy) => {
    expect(sourceErrorCopy(code)).toBe(copy);
  });

  it("covers every source error code in the contract", () => {
    for (const code of ACTIVITY_SOURCE_ERROR_CODES) {
      expect(sourceErrorCopy(code)).toEqual(expect.any(String));
    }
  });
});

describe("formatUpdatedAt", () => {
  it("uses the day in the account time zone to decide what today is", () => {
    // 17/10 18:00Z là 18/10 01:00 ở Việt Nam — cùng ngày với NOW.
    expect(
      formatUpdatedAt("2026-10-17T18:00:00.000Z", "Asia/Ho_Chi_Minh", NOW),
    ).toBe("01:00");
    expect(formatUpdatedAt("2026-10-17T18:00:00.000Z", "UTC", NOW)).toBe(
      "17/10/2026",
    );
  });
});

describe("linkErrorMessage", () => {
  it.each([
    [
      "GITHUB_NOT_CONNECTED",
      "Kết nối GitHub không còn dùng được — cập nhật token ở Cài đặt.",
    ],
    [
      "GITHUB_REPOSITORY_NOT_ACCESSIBLE",
      "Không đọc được repository này — kiểm tra quyền của token.",
    ],
    [
      "GITHUB_RATE_LIMITED",
      "GitHub đang tạm giới hạn truy cập. Thử lại sau ít phút.",
    ],
    [
      "GITHUB_UNAVAILABLE",
      "Chưa kết nối được tới GitHub. Thử lại sau ít phút.",
    ],
    [
      "WAKATIME_NOT_CONNECTED",
      "Kết nối WakaTime không còn dùng được — cập nhật API key ở Cài đặt.",
    ],
    ["WAKATIME_PROJECT_NOT_FOUND", "Không còn thấy project này trên WakaTime."],
    [
      "WAKATIME_RATE_LIMITED",
      "WakaTime đang tạm giới hạn truy cập. Thử lại sau ít phút.",
    ],
    [
      "WAKATIME_UNAVAILABLE",
      "Chưa kết nối được tới WakaTime. Thử lại sau ít phút.",
    ],
  ])("explains %s", (code, message) => {
    expect(
      linkErrorMessage({ status: "error", code, message: "generic" }),
    ).toBe(message);
  });

  it("falls back to the API message", () => {
    expect(linkErrorMessage({ status: "error", message: "Lỗi mạng." })).toBe(
      "Lỗi mạng.",
    );
  });
});
