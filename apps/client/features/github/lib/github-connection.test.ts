import type { GitHubConnectionResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  accountChangeOf,
  connectErrorMessage,
  connectionHealth,
} from "./github-connection";

const NOW = new Date("2026-10-18T10:00:00.000Z");

const connection = (
  overrides: Partial<GitHubConnectionResponse> = {},
): GitHubConnectionResponse => ({
  accountLogin: "trhgatu",
  status: "ACTIVE",
  expiresAt: "2027-10-14T00:00:00.000Z",
  lastVerifiedAt: "2026-10-01T00:00:00.000Z",
  connectedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

describe("connectionHealth", () => {
  it("is active with its expiry, or with none when GitHub gives no date", () => {
    expect(connectionHealth(connection(), NOW)).toEqual({
      kind: "active",
      expiresAt: "2027-10-14T00:00:00.000Z",
    });
    expect(connectionHealth(connection({ expiresAt: null }), NOW)).toEqual({
      kind: "active",
      expiresAt: null,
    });
  });

  it("reminds within 14 days of the expiry, counting whole days left", () => {
    expect(
      connectionHealth(
        connection({ expiresAt: "2026-10-27T00:00:00.000Z" }),
        NOW,
      ),
    ).toEqual({
      kind: "expiring",
      expiresAt: "2026-10-27T00:00:00.000Z",
      daysLeft: 9,
    });
    expect(
      connectionHealth(
        connection({ expiresAt: "2026-11-02T00:00:00.000Z" }),
        NOW,
      ).kind,
    ).toBe("active");
  });

  it("is unusable when expired or revoked — even if the page was open long", () => {
    expect(connectionHealth(connection({ status: "EXPIRED" }), NOW)).toEqual({
      kind: "expired",
    });
    expect(connectionHealth(connection({ status: "REVOKED" }), NOW)).toEqual({
      kind: "revoked",
    });
    expect(
      connectionHealth(
        connection({ expiresAt: "2026-10-18T09:00:00.000Z" }),
        NOW,
      ),
    ).toEqual({ kind: "expired" });
  });
});

describe("connectErrorMessage", () => {
  it.each([
    [
      "GITHUB_TOKEN_INVALID",
      "GitHub không chấp nhận token này. Kiểm tra lại token rồi thử lại.",
    ],
    [
      "GITHUB_TOKEN_INSUFFICIENT_SCOPE",
      "Token thiếu quyền đọc. Cần Contents và Pull requests ở mức Read-only.",
    ],
    [
      "GITHUB_UNAVAILABLE",
      "Chưa kết nối được tới GitHub. Thử lại sau ít phút.",
    ],
  ])("says what to do for %s", (code, message) => {
    expect(
      connectErrorMessage({ status: "error", code, message: "generic" }),
    ).toBe(message);
  });

  it("falls back to the API message for anything else", () => {
    expect(
      connectErrorMessage({ status: "error", message: "Không thể kết nối." }),
    ).toBe("Không thể kết nối.");
  });
});

describe("accountChangeOf", () => {
  it("reads both accounts from the error", () => {
    expect(
      accountChangeOf({
        status: "error",
        code: "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
        message: "x",
      }),
    ).toEqual({ currentAccount: "trhgatu", newAccount: "other-account" });
  });

  it("still asks with generic names when the error carries none", () => {
    expect(
      accountChangeOf({
        status: "error",
        code: "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED",
        message: "x",
      }),
    ).toEqual({
      currentAccount: "tài khoản hiện tại",
      newAccount: "tài khoản mới",
    });
  });

  it("is null for any other error", () => {
    expect(
      accountChangeOf({
        status: "error",
        code: "GITHUB_TOKEN_INVALID",
        message: "x",
      }),
    ).toBeNull();
  });
});
