// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const browser = vi.hoisted(() => ({ zone: "Asia/Saigon" }));

vi.mock("@/features/account/lib/time-zone", () => ({
  getBrowserTimeZone: () => browser.zone,
}));

import { useBrowserTimeZone } from "./use-browser-time-zone";

afterEach(cleanup);

function Probe() {
  return <p>{useBrowserTimeZone() ?? "unknown"}</p>;
}

describe("useBrowserTimeZone", () => {
  it("reads the zone again when the user comes back to the tab", () => {
    render(<Probe />);
    expect(screen.getByText("Asia/Saigon")).toBeTruthy();

    browser.zone = "Asia/Tokyo";
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(screen.getByText("Asia/Tokyo")).toBeTruthy();
  });
});
