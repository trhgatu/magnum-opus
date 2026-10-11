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

import { TimeZoneMismatchNotice } from "./time-zone-mismatch-notice";

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  browserTimeZone.value = "Asia/Saigon";
});

afterEach(cleanup);

describe("TimeZoneMismatchNotice", () => {
  it("renders nothing until the browser time zone is known", () => {
    browserTimeZone.value = null;
    const { container } = render(
      <TimeZoneMismatchNotice accountTimeZone="UTC" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the zones match, even through an alias", () => {
    const { container } = render(
      <TimeZoneMismatchNotice accountTimeZone="Asia/Ho_Chi_Minh" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("explains the mismatch and switches to the browser zone", async () => {
    updateMyTimeZone.mockResolvedValue({
      status: "success",
      timeZone: "Asia/Saigon",
    });
    render(<TimeZoneMismatchNotice accountTimeZone="UTC" />);

    expect(screen.getByText(/UTC/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dùng Asia/Saigon" }));

    await waitFor(() =>
      expect(updateMyTimeZone).toHaveBeenCalledWith("Asia/Saigon"),
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        "Đã đổi múi giờ sang Asia/Saigon",
      ),
    );
  });

  it("stays hidden after the user keeps the account zone", () => {
    const { container, unmount } = render(
      <TimeZoneMismatchNotice accountTimeZone="UTC" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Giữ nguyên" }));
    expect(container.firstChild).toBeNull();
    expect(updateMyTimeZone).not.toHaveBeenCalled();

    unmount();
    const again = render(<TimeZoneMismatchNotice accountTimeZone="UTC" />);
    expect(again.container.firstChild).toBeNull();
  });

  it("asks again when the browser moves to yet another zone", () => {
    const first = render(<TimeZoneMismatchNotice accountTimeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Giữ nguyên" }));
    first.unmount();

    browserTimeZone.value = "Asia/Tokyo";
    render(<TimeZoneMismatchNotice accountTimeZone="UTC" />);

    expect(
      screen.getByRole("button", { name: "Dùng Asia/Tokyo" }),
    ).toBeTruthy();
  });

  it("shows the error when switching fails", async () => {
    updateMyTimeZone.mockResolvedValue({
      status: "error",
      message: "Không thể lưu, vui lòng thử lại.",
    });
    render(<TimeZoneMismatchNotice accountTimeZone="UTC" />);

    fireEvent.click(screen.getByRole("button", { name: "Dùng Asia/Saigon" }));

    expect(
      await screen.findByText("Không thể lưu, vui lòng thử lại."),
    ).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
