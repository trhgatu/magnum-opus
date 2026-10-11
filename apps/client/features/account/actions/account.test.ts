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

import { updateMyTimeZone } from "./account";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateMyTimeZone", () => {
  it("saves the time zone and refreshes pages that depend on it", async () => {
    apiFetch.mockResolvedValue({ timeZone: "Asia/Ho_Chi_Minh" });

    await expect(updateMyTimeZone("Asia/Ho_Chi_Minh")).resolves.toEqual({
      status: "success",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    expect(apiFetch).toHaveBeenCalledWith("/users/me/time-zone", {
      method: "PATCH",
      body: JSON.stringify({ timeZone: "Asia/Ho_Chi_Minh" }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an empty or oversized value before calling the API", async () => {
    await expect(updateMyTimeZone("  ")).resolves.toMatchObject({
      status: "error",
    });
    await expect(updateMyTimeZone("x".repeat(65))).resolves.toMatchObject({
      status: "error",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects a non-string payload instead of throwing", async () => {
    await expect(
      updateMyTimeZone(null as unknown as string),
    ).resolves.toMatchObject({ status: "error" });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("passes the backend error code through", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 400,
        code: "INVALID_TIME_ZONE",
        message: "unsafe backend detail",
      }),
    );

    await expect(updateMyTimeZone("Mars/Base")).resolves.toMatchObject({
      status: "error",
      code: "INVALID_TIME_ZONE",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
