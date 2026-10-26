// @vitest-environment jsdom

import type { WakaTimeConnectionResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connectWakaTime, disconnectWakaTime, notifySuccess } = vi.hoisted(
  () => ({
    connectWakaTime: vi.fn(),
    disconnectWakaTime: vi.fn(),
    notifySuccess: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock("@/features/wakatime/actions/wakatime", () => ({
  connectWakaTime,
  disconnectWakaTime,
}));
vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { WakaTimeConnectionCard } from "./wakatime-connection-card";

const connection = (
  overrides: Partial<WakaTimeConnectionResponse> = {},
): WakaTimeConnectionResponse => ({
  account: { id: "waka-user", username: "trhgatu" },
  status: "ACTIVE",
  lastVerifiedAt: "2026-10-26T07:20:00.000Z",
  connectedAt: "2026-10-26T07:20:00.000Z",
  ...overrides,
});

const keyInput = () => screen.getByLabelText("API key");

const pasteAndSubmit = (key: string, button: string) => {
  fireEvent.change(keyInput(), { target: { value: key } });
  fireEvent.click(screen.getByRole("button", { name: button }));
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("WakaTimeConnectionCard", () => {
  it("guides through finding the key when not connected, and connects", async () => {
    connectWakaTime.mockResolvedValue({
      status: "success",
      connection: connection(),
    });
    render(<WakaTimeConnectionCard connection={null} timeZone="UTC" />);

    expect(screen.getByText(/wakatime\.com\/settings\/api-key/)).toBeTruthy();
    // Ô key là password: không hiện ra màn hình.
    expect(keyInput().getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "Kết nối" })).toHaveProperty(
      "disabled",
      true,
    );

    pasteAndSubmit("waka_fake-key", "Kết nối");

    await waitFor(() => expect(screen.getByText("trhgatu")).toBeTruthy());
    expect(connectWakaTime).toHaveBeenCalledWith({
      apiKey: "waka_fake-key",
      confirmAccountChange: false,
    });
    expect(notifySuccess).toHaveBeenCalledWith("Đã kết nối WakaTime");
    // Key không còn ở đâu trên trang.
    expect(document.body.innerHTML).not.toContain("waka_fake-key");
    expect(screen.queryByLabelText("API key")).toBeNull();
  });

  it("shows the account and when it was last checked, in the account time zone", () => {
    render(
      <WakaTimeConnectionCard
        connection={connection()}
        timeZone="Asia/Ho_Chi_Minh"
      />,
    );

    expect(screen.getByText("trhgatu")).toBeTruthy();
    // 07:20Z là 14:20 ở Việt Nam.
    expect(screen.getByText("Kiểm tra lần cuối 26/10/2026 14:20")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thay key" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ngắt kết nối" })).toBeTruthy();
    // Key không hết hạn: không có nhắc nào.
    expect(screen.queryByText(/hết hạn/)).toBeNull();
  });

  it("opens the key field right away when the key no longer works, and can still disconnect", async () => {
    disconnectWakaTime.mockResolvedValue({ status: "success" });
    render(
      <WakaTimeConnectionCard
        connection={connection({ status: "REVOKED" })}
        timeZone="UTC"
      />,
    );

    expect(
      screen.getByText(
        "API key không còn dùng được — dán key mới để tiếp tục.",
      ),
    ).toBeTruthy();
    expect(keyInput()).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lưu key mới" })).toBeTruthy();
    // Không có gì để "Hủy" về: kết nối cũ không dùng được.
    expect(screen.queryByRole("button", { name: "Hủy" })).toBeNull();

    // Dán key mới rồi đổi ý, ngắt kết nối luôn.
    fireEvent.change(keyInput(), { target: { value: "waka_unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Ngắt kết nối" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ngắt kết nối" }).at(-1)!,
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã ngắt kết nối WakaTime"),
    );
    // Key chưa lưu không được ở lại trong ô nhập.
    expect(await screen.findByRole("button", { name: "Kết nối" })).toBeTruthy();
    expect((keyInput() as HTMLInputElement).value).toBe("");
    expect(document.body.innerHTML).not.toContain("waka_unsaved");
  });

  it("keeps the pasted key and explains a rejected one", async () => {
    connectWakaTime.mockResolvedValue({
      status: "error",
      code: "WAKATIME_KEY_INVALID",
      message: "Dữ liệu không hợp lệ.",
    });
    render(<WakaTimeConnectionCard connection={null} timeZone="UTC" />);

    pasteAndSubmit("waka_wrong", "Kết nối");

    await waitFor(() =>
      expect(
        screen.getByText(
          "WakaTime không chấp nhận API key này. Kiểm tra lại key rồi thử lại.",
        ),
      ).toBeTruthy(),
    );
    expect((keyInput() as HTMLInputElement).value).toBe("waka_wrong");
  });

  it("asks before switching to another WakaTime account, then replaces", async () => {
    connectWakaTime
      .mockResolvedValueOnce({
        status: "error",
        code: "WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
        message: "Xung đột.",
      })
      .mockResolvedValueOnce({
        status: "success",
        connection: connection({
          account: { id: "other-id", username: "other-account" },
        }),
      });
    render(<WakaTimeConnectionCard connection={connection()} timeZone="UTC" />);

    fireEvent.click(screen.getByRole("button", { name: "Thay key" }));
    pasteAndSubmit("waka_other", "Lưu key mới");

    await waitFor(() =>
      expect(
        screen.getByText("Đổi sang tài khoản WakaTime khác?"),
      ).toBeTruthy(),
    );
    // Lần gửi đầu không bao giờ tự xác nhận đổi tài khoản.
    expect(connectWakaTime).toHaveBeenNthCalledWith(1, {
      apiKey: "waka_other",
      confirmAccountChange: false,
    });
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("other-account");
    expect(dialog.textContent).toContain("trhgatu");

    fireEvent.click(
      await screen.findByRole("button", { name: "Đổi tài khoản" }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        "Đã cập nhật API key WakaTime",
      ),
    );
    expect(connectWakaTime).toHaveBeenLastCalledWith({
      apiKey: "waka_other",
      confirmAccountChange: true,
    });
  });

  it("disconnects after confirmation", async () => {
    disconnectWakaTime.mockResolvedValue({ status: "success" });
    render(<WakaTimeConnectionCard connection={connection()} timeZone="UTC" />);

    fireEvent.click(screen.getByRole("button", { name: "Ngắt kết nối" }));
    expect(screen.getByText("Ngắt kết nối WakaTime?")).toBeTruthy();
    // Mở hộp xác nhận chưa ngắt gì.
    expect(disconnectWakaTime).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ngắt kết nối" }).at(-1)!,
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã ngắt kết nối WakaTime"),
    );
    expect(await screen.findByRole("button", { name: "Kết nối" })).toBeTruthy();
  });
});
