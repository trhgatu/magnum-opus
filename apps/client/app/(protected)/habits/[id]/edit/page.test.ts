import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import EditHabitPage from "./page";

describe("EditHabitPage", () => {
  it("sends old edit links to the habit page", async () => {
    await EditHabitPage({
      params: Promise.resolve({ id: "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d" }),
    });

    expect(permanentRedirect).toHaveBeenCalledWith(
      "/habits/6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d",
    );
  });

  it("keeps a strange id inside the habit path", async () => {
    await EditHabitPage({ params: Promise.resolve({ id: "../settings?x" }) });

    expect(permanentRedirect).toHaveBeenLastCalledWith(
      "/habits/..%2Fsettings%3Fx",
    );
  });
});
