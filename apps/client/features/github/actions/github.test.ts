import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, revalidatePath } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return { ...actual, apiFetch };
});

import { ApiError } from "@/lib/api";

import { connectGitHub, disconnectGitHub } from "./github";

const connection = {
  accountLogin: "trhgatu",
  status: "ACTIVE",
  expiresAt: null,
  lastVerifiedAt: "2026-10-18T00:00:00.000Z",
  connectedAt: "2026-10-18T00:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("connectGitHub", () => {
  it("sends the trimmed token and refreshes Settings", async () => {
    apiFetch.mockResolvedValue(connection);

    await expect(connectGitHub({ token: "  fake-token \n" })).resolves.toEqual({
      status: "success",
      connection,
    });

    expect(apiFetch).toHaveBeenCalledWith("/integrations/github", {
      method: "PUT",
      body: JSON.stringify({
        token: "fake-token",
        confirmAccountChange: false,
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("confirms an account change only when explicitly true", async () => {
    apiFetch.mockResolvedValue(connection);

    await connectGitHub({ token: "fake-token", confirmAccountChange: true });
    await connectGitHub({
      token: "fake-token",
      confirmAccountChange: "yes" as unknown as boolean,
    });

    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      confirmAccountChange: true,
    });
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toMatchObject({
      confirmAccountChange: false,
    });
  });

  it.each([
    ["an empty token", { token: "   " }],
    ["a token with spaces inside", { token: "fake token" }],
    ["an oversized token", { token: "x".repeat(256) }],
    ["no token at all", {} as { token: string }],
    ["a payload that is not an object", null as unknown as { token: string }],
  ])("rejects %s before calling the API", async (_label, input) => {
    await expect(connectGitHub(input)).resolves.toMatchObject({
      status: "error",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("returns API errors with their code and args", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
        message: "Dữ liệu đã thay đổi.",
      }),
    );

    await expect(connectGitHub({ token: "fake-token" })).resolves.toMatchObject(
      {
        status: "error",
        code: "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
      },
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("disconnectGitHub", () => {
  it("disconnects and refreshes Settings", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(disconnectGitHub()).resolves.toEqual({ status: "success" });
    expect(apiFetch).toHaveBeenCalledWith("/integrations/github", {
      method: "DELETE",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("returns an API failure instead of throwing", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({ kind: "network", status: null, message: "Mất mạng." }),
    );

    await expect(disconnectGitHub()).resolves.toMatchObject({
      status: "error",
      message: "Mất mạng.",
    });
  });
});
