import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import EditRoutinePage from "./page";

describe("EditRoutinePage", () => {
  it("sends old edit links to the routine page", async () => {
    await EditRoutinePage({
      params: Promise.resolve({ id: "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d" }),
    });

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/routines/6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d",
    );
  });

  it("keeps a strange id inside the routine path", async () => {
    await EditRoutinePage({ params: Promise.resolve({ id: "../settings?x" }) });

    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/routines/..%2Fsettings%3Fx",
    );
  });
});
