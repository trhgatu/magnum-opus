// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyEmail } = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
}));

vi.mock("../actions/auth", () => ({ verifyEmail }));

import { VerifyEmailForm } from "./verify-email-form";

const VALID_TOKEN = "a".repeat(32);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("VerifyEmailForm", () => {
  it("disables the submit button and offers a resend link for a too-short token", () => {
    render(<VerifyEmailForm token="too-short" />);

    expect(
      screen.getByRole("button", { name: "Xác minh email" }),
    ).toBeDisabled();
    expect(screen.getByRole("link", { name: "Gửi lại liên kết" })).toBeTruthy();
  });

  it("enables the submit button and submits a valid token", async () => {
    verifyEmail.mockResolvedValue({ status: "idle" });

    render(<VerifyEmailForm token={VALID_TOKEN} />);
    const submit = screen.getByRole("button", { name: "Xác minh email" });
    expect(submit).not.toBeDisabled();
    expect(screen.queryByRole("link", { name: "Gửi lại liên kết" })).toBeNull();

    fireEvent.click(submit);

    await vi.waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));
    const formData = verifyEmail.mock.calls[0][1] as FormData;
    expect(formData.get("token")).toBe(VALID_TOKEN);
  });

  it("shows a success message and a link to log in once verified", async () => {
    verifyEmail.mockResolvedValue({ status: "success" });

    render(<VerifyEmailForm token={VALID_TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));

    expect(await screen.findByText("Email đã được xác minh.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeTruthy();
  });

  it("shows the form-level error for an expired or invalid token", async () => {
    verifyEmail.mockResolvedValue({
      status: "error",
      formError: "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
    });

    render(<VerifyEmailForm token={VALID_TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Xác minh email" }));

    expect(
      await screen.findByText(
        "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
      ),
    ).toBeTruthy();
  });
});
