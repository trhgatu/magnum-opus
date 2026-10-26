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

import { connectWakaTime, disconnectWakaTime } from "./wakatime";

const connection = {
  account: { id: "waka-user", username: "trhgatu" },
  status: "ACTIVE",
  lastVerifiedAt: "2026-10-26T00:00:00.000Z",
  connectedAt: "2026-10-26T00:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("connectWakaTime", () => {
  it("sends the trimmed key and refreshes Settings", async () => {
    apiFetch.mockResolvedValue(connection);

    await expect(
      connectWakaTime({ apiKey: "  waka_fake-key \n" }),
    ).resolves.toEqual({ status: "success", connection });

    expect(apiFetch).toHaveBeenCalledWith("/integrations/wakatime", {
      method: "PUT",
      body: JSON.stringify({
        apiKey: "waka_fake-key",
        confirmAccountChange: false,
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("confirms an account change only when explicitly true", async () => {
    apiFetch.mockResolvedValue(connection);

    await connectWakaTime({ apiKey: "waka_fake", confirmAccountChange: true });
    await connectWakaTime({
      apiKey: "waka_fake",
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
    ["an empty key", { apiKey: "   " }],
    ["a key with spaces inside", { apiKey: "waka_ fake" }],
    ["an oversized key", { apiKey: "x".repeat(256) }],
    ["no key at all", {} as { apiKey: string }],
    ["a payload that is not an object", null as unknown as { apiKey: string }],
  ])("rejects %s before calling the API", async (_label, input) => {
    await expect(connectWakaTime(input)).resolves.toMatchObject({
      status: "error",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("returns API errors with their code and args", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
        message: "Dữ liệu đã thay đổi.",
      }),
    );

    await expect(
      connectWakaTime({ apiKey: "waka_fake" }),
    ).resolves.toMatchObject({
      status: "error",
      code: "WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED",
      args: { currentAccount: "trhgatu", newAccount: "other-account" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("disconnectWakaTime", () => {
  it("disconnects and refreshes Settings", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(disconnectWakaTime()).resolves.toEqual({ status: "success" });
    expect(apiFetch).toHaveBeenCalledWith("/integrations/wakatime", {
      method: "DELETE",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("returns an API failure instead of throwing", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({ kind: "network", status: null, message: "Mất mạng." }),
    );

    await expect(disconnectWakaTime()).resolves.toMatchObject({
      status: "error",
      message: "Mất mạng.",
    });
  });
});
