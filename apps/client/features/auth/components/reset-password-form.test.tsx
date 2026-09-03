// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resetPassword } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}));

vi.mock("../actions/auth", () => ({ resetPassword }));

import { ResetPasswordForm } from "./reset-password-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ResetPasswordForm", () => {
  it("submits the token alongside the new password", async () => {
    resetPassword.mockResolvedValue({ status: "idle" });

    render(<ResetPasswordForm token="a-valid-reset-token" />);
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "a-new-strong-password" },
    });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu mới"), {
      target: { value: "a-new-strong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    await vi.waitFor(() => expect(resetPassword).toHaveBeenCalledTimes(1));
    const formData = resetPassword.mock.calls[0][1] as FormData;
    expect(formData.get("token")).toBe("a-valid-reset-token");
    expect(formData.get("password")).toBe("a-new-strong-password");
    expect(formData.get("confirmPassword")).toBe("a-new-strong-password");
  });

  it("shows a success message and a link to log in with the new password", async () => {
    resetPassword.mockResolvedValue({ status: "success" });

    render(<ResetPasswordForm token="a-valid-reset-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    expect(
      await screen.findByText(
        "Mật khẩu đã được thay đổi. Tất cả thiết bị cũ đã đăng xuất.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Đăng nhập bằng mật khẩu mới" }),
    ).toBeTruthy();
  });

  it("shows field errors for a short or mismatched password", async () => {
    resetPassword.mockResolvedValue({
      status: "error",
      fieldErrors: {
        password: ["Mật khẩu phải có ít nhất 12 ký tự."],
        confirmPassword: ["Hai mật khẩu chưa trùng nhau."],
      },
    });

    render(<ResetPasswordForm token="a-valid-reset-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    expect(
      await screen.findByText("Mật khẩu phải có ít nhất 12 ký tự."),
    ).toBeTruthy();
    expect(screen.getByText("Hai mật khẩu chưa trùng nhau.")).toBeTruthy();
  });

  it("shows the form-level error for an expired or invalid token", async () => {
    resetPassword.mockResolvedValue({
      status: "error",
      formError: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
    });

    render(<ResetPasswordForm token="an-expired-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    expect(
      await screen.findByText(
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      ),
    ).toBeTruthy();
  });
});
