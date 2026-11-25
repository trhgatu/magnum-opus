import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch };
});

import { openOnThisDayItem } from "./on-this-day";

const id = "36cbf877-1462-42bd-b18a-42577960784a";

describe("openOnThisDayItem", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("records the opened item", async () => {
    apiFetch.mockResolvedValue(undefined);

    await openOnThisDayItem("MEMORY", id);

    expect(apiFetch).toHaveBeenCalledWith("/reflection/on-this-day/opened", {
      method: "POST",
      body: JSON.stringify({ kind: "MEMORY", id }),
    });
  });

  it("sends nothing for an id or kind it does not trust", async () => {
    await openOnThisDayItem("MEMORY", "not-an-id");
    await openOnThisDayItem("HABIT" as never, id);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  // Mở mục vẫn phải chạy dù vườn không ghi được.
  it("swallows a failure", async () => {
    apiFetch.mockRejectedValue(new Error("down"));

    await expect(openOnThisDayItem("JOURNAL", id)).resolves.toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith("/reflection/on-this-day/opened", {
      method: "POST",
      body: JSON.stringify({ kind: "JOURNAL", id }),
    });
  });
});
