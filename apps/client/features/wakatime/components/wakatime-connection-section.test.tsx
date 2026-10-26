// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getWakaTimeConnection } = vi.hoisted(() => ({
  getWakaTimeConnection: vi.fn(),
}));

vi.mock("@/features/wakatime/api/wakatime-connection", () => ({
  getWakaTimeConnection,
}));
vi.mock("./wakatime-connection-card", () => ({
  WakaTimeConnectionCard: () => <p>WakaTime card</p>,
}));

import { WakaTimeConnectionSection } from "./wakatime-connection-section";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("WakaTimeConnectionSection", () => {
  it("shows the card with the connection it read", async () => {
    getWakaTimeConnection.mockResolvedValue(null);

    render(await WakaTimeConnectionSection({ timeZone: "UTC" }));

    expect(screen.getByText("WakaTime card")).toBeTruthy();
  });

  it("keeps a failed read inside this card", async () => {
    getWakaTimeConnection.mockRejectedValue(new Error("integrations down"));

    render(await WakaTimeConnectionSection({ timeZone: "UTC" }));

    expect(
      screen.getByText(
        "Chưa tải được trạng thái kết nối WakaTime. Tải lại trang để thử lại.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("WakaTime card")).toBeNull();
  });
});
