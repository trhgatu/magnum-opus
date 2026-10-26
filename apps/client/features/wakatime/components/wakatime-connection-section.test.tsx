// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getWakaTimeConnection, cardProps } = vi.hoisted(() => ({
  getWakaTimeConnection: vi.fn(),
  cardProps: vi.fn(),
}));

vi.mock("@/features/wakatime/api/wakatime-connection", () => ({
  getWakaTimeConnection,
}));
vi.mock("./wakatime-connection-card", () => ({
  WakaTimeConnectionCard: (props: unknown) => {
    cardProps(props);
    return <p>WakaTime card</p>;
  },
}));

import { WakaTimeConnectionSection } from "./wakatime-connection-section";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("WakaTimeConnectionSection", () => {
  it.each([
    ["a connection", { account: { id: "waka-user", username: "trhgatu" } }],
    ["no connection", null],
  ])("hands the card %s it read, with the time zone", async (_, connection) => {
    getWakaTimeConnection.mockResolvedValue(connection);

    render(await WakaTimeConnectionSection({ timeZone: "Asia/Ho_Chi_Minh" }));

    expect(screen.getByText("WakaTime card")).toBeTruthy();
    expect(cardProps).toHaveBeenCalledWith({
      connection,
      timeZone: "Asia/Ho_Chi_Minh",
    });
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
