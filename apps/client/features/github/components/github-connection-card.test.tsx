// @vitest-environment jsdom

import type { GitHubConnectionResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connectGitHub, disconnectGitHub, notifySuccess } = vi.hoisted(() => ({
  connectGitHub: vi.fn(),
  disconnectGitHub: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/github/actions/github", () => ({
  connectGitHub,
  disconnectGitHub,
}));
vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { GitHubConnectionCard } from "./github-connection-card";

const connection = (
  overrides: Partial<GitHubConnectionResponse> = {},
): GitHubConnectionResponse => ({
  accountLogin: "trhgatu",
  status: "ACTIVE",
  expiresAt: "2099-10-14T00:00:00.000Z",
  lastVerifiedAt: "2026-10-01T00:00:00.000Z",
  connectedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const tokenInput = () =>
  screen.getByLabelText("Fine-grained personal access token");

const pasteAndSubmit = (token: string, button: string) => {
  fireEvent.change(tokenInput(), { target: { value: token } });
  fireEvent.click(screen.getByRole("button", { name: button }));
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("GitHubConnectionCard", () => {
  it("guides through creating a token when not connected, and connects", async () => {
    connectGitHub.mockResolvedValue({
      status: "success",
      connection: connection(),
    });
    render(<GitHubConnectionCard connection={null} timeZone="UTC" />);

    expect(screen.getByText(/Fine-grained tokens/)).toBeTruthy();
    // Ô token là password: không hiện ra màn hình.
    expect(tokenInput().getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "Kết nối" })).toHaveProperty(
      "disabled",
      true,
    );

    pasteAndSubmit("fake-token", "Kết nối");

    await waitFor(() => expect(screen.getByText("trhgatu")).toBeTruthy());
    expect(connectGitHub).toHaveBeenCalledWith({
      token: "fake-token",
      confirmAccountChange: false,
    });
    expect(notifySuccess).toHaveBeenCalledWith("Đã kết nối GitHub");
    expect(
      screen.queryByLabelText("Fine-grained personal access token"),
    ).toBeNull();
  });

  it("shows the account and expiry, never the token", () => {
    render(
      <GitHubConnectionCard
        connection={connection({ expiresAt: null })}
        timeZone="UTC"
      />,
    );

    expect(screen.getByText("trhgatu")).toBeTruthy();
    expect(screen.getByText("Token không có ngày hết hạn")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Thay token" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ngắt kết nối" })).toBeTruthy();
  });

  it("says when the connection is no longer usable", () => {
    render(
      <GitHubConnectionCard
        connection={connection({ status: "REVOKED" })}
        timeZone="UTC"
      />,
    );

    expect(screen.getByText(/GitHub đã thu hồi token\./)).toBeTruthy();
  });

  it("keeps the pasted token and explains a rejected one", async () => {
    connectGitHub.mockResolvedValue({
      status: "error",
      code: "GITHUB_TOKEN_INSUFFICIENT_SCOPE",
      message: "Dữ liệu không hợp lệ.",
    });
    render(<GitHubConnectionCard connection={null} timeZone="UTC" />);

    pasteAndSubmit("fake-token", "Kết nối");

    await waitFor(() =>
      expect(
        screen.getByText(
          "Token thiếu quyền đọc. Cần Contents và Pull requests ở mức Read-only.",
        ),
      ).toBeTruthy(),
    );
    expect((tokenInput() as HTMLInputElement).value).toBe("fake-token");
  });

  it("asks before switching to another GitHub account, then replaces", async () => {
    connectGitHub
      .mockResolvedValueOnce({
        status: "error",
        code: "GITHUB_ACCOUNT_CHANGE_UNCONFIRMED",
        args: { currentAccount: "trhgatu", newAccount: "other-account" },
        message: "Xung đột.",
      })
      .mockResolvedValueOnce({
        status: "success",
        connection: connection({ accountLogin: "other-account" }),
      });
    render(<GitHubConnectionCard connection={connection()} timeZone="UTC" />);

    fireEvent.click(screen.getByRole("button", { name: "Thay token" }));
    pasteAndSubmit("other-token", "Lưu token mới");

    await waitFor(() =>
      expect(screen.getByText("Đổi sang tài khoản GitHub khác?")).toBeTruthy(),
    );
    expect(screen.getAllByText("other-account").length).toBeGreaterThan(0);

    fireEvent.click(
      await screen.findByRole("button", { name: "Đổi tài khoản" }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã cập nhật token GitHub"),
    );
    expect(connectGitHub).toHaveBeenLastCalledWith({
      token: "other-token",
      confirmAccountChange: true,
    });
  });

  it("disconnects after confirmation", async () => {
    disconnectGitHub.mockResolvedValue({ status: "success" });
    render(<GitHubConnectionCard connection={connection()} timeZone="UTC" />);

    fireEvent.click(screen.getByRole("button", { name: "Ngắt kết nối" }));
    expect(screen.getByText("Ngắt kết nối GitHub?")).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ngắt kết nối" }).at(-1)!,
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã ngắt kết nối GitHub"),
    );
    // Transition kết thúc sau toast: đợi nút trở lại nhãn bình thường.
    expect(await screen.findByRole("button", { name: "Kết nối" })).toBeTruthy();
  });
});
