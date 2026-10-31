import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import EditMemoryPage from "./page";

describe("EditMemoryPage", () => {
  it("sends old edit links to the memory page", async () => {
    await EditMemoryPage({
      params: Promise.resolve({ id: "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d" }),
    });

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/memories/6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d",
    );
  });

  it("keeps a strange id inside the memory path", async () => {
    await EditMemoryPage({ params: Promise.resolve({ id: "../settings?x" }) });

    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/memories/..%2Fsettings%3Fx",
    );
  });
});
