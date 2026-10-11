// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateMyTimeZone, notifySuccess, browserTimeZone } = vi.hoisted(() => ({
  updateMyTimeZone: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
  browserTimeZone: { value: null as string | null },
}));

vi.mock("@/features/account/actions/account", () => ({ updateMyTimeZone }));
vi.mock("@/lib/toast", () => ({ notifySuccess }));
vi.mock("@/features/account/hooks/use-browser-time-zone", () => ({
  useBrowserTimeZone: () => browserTimeZone.value,
}));

import { TimeZoneField } from "./time-zone-field";

beforeEach(() => {
  vi.clearAllMocks();
  browserTimeZone.value = null;
});

afterEach(cleanup);

const trigger = () => screen.getByRole("combobox", { name: "Múi giờ" });

const choose = (zone: string, query = zone) => {
  fireEvent.click(trigger());
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm múi giờ" }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole("option", { name: new RegExp(zone) }));
};

describe("TimeZoneField", () => {
  it("shows the stored time zone and keeps Save disabled until it changes", () => {
    render(<TimeZoneField timeZone="UTC" />);

    expect(trigger().textContent).toContain("UTC");
    expect(screen.getByRole("button", { name: "Lưu múi giờ" })).toHaveProperty(
      "disabled",
      true,
    );

    choose("Europe/London", "london");

    expect(screen.getByRole("button", { name: "Lưu múi giờ" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("saves the selected time zone and confirms it", async () => {
    updateMyTimeZone.mockResolvedValue({
      status: "success",
      timeZone: "Europe/London",
    });
    render(<TimeZoneField timeZone="UTC" />);

    choose("Europe/London", "london");
    fireEvent.click(screen.getByRole("button", { name: "Lưu múi giờ" }));

    await waitFor(() =>
      expect(updateMyTimeZone).toHaveBeenCalledWith("Europe/London"),
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        "Đã đổi múi giờ sang Europe/London",
      ),
    );
  });

  it("offers the browser time zone when it differs from the account", async () => {
    browserTimeZone.value = "Asia/Saigon";
    updateMyTimeZone.mockResolvedValue({
      status: "success",
      timeZone: "Asia/Saigon",
    });
    render(<TimeZoneField timeZone="UTC" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Dùng múi giờ của máy này (Asia/Saigon)",
      }),
    );

    await waitFor(() =>
      expect(updateMyTimeZone).toHaveBeenCalledWith("Asia/Saigon"),
    );
  });

  it("hides the shortcut when the browser zone is just an alias of the account zone", () => {
    browserTimeZone.value = "Asia/Saigon";
    render(<TimeZoneField timeZone="Asia/Ho_Chi_Minh" />);

    expect(
      screen.queryByRole("button", { name: /Dùng múi giờ của máy này/ }),
    ).toBeNull();
  });

  it("shows the error and keeps the choice when saving fails", async () => {
    updateMyTimeZone.mockResolvedValue({
      status: "error",
      message: "Múi giờ không hợp lệ.",
    });
    render(<TimeZoneField timeZone="UTC" />);

    choose("Europe/London", "london");
    fireEvent.click(screen.getByRole("button", { name: "Lưu múi giờ" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Múi giờ không hợp lệ.",
    );
    expect(trigger().textContent).toContain("Europe/London");
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
