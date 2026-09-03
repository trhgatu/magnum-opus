// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { login } = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock("@/features/auth/actions/auth", () => ({ login }));

import { LoginForm } from "./login-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("LoginForm", () => {
  it("submits email, password and the redirect target to the login action", async () => {
    login.mockResolvedValue({ status: "idle" });

    render(<LoginForm next="/journal" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await vi.waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    const formData = login.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("member@example.com");
    expect(formData.get("password")).toBe("correct-password");
    expect(formData.get("next")).toBe("/journal");
  });

  it("shows the form-level error and correlation id on failed login", async () => {
    login.mockResolvedValue({
      status: "error",
      formError: "Email hoặc mật khẩu không đúng.",
      correlationId: "corr-123",
      values: { email: "member@example.com" },
    });

    render(<LoginForm next="/me" />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(
      await screen.findByText("Email hoặc mật khẩu không đúng."),
    ).toBeTruthy();
    expect(screen.getByText(/corr-123/)).toBeTruthy();
  });

  it("offers to resend the verification email when login requires it", async () => {
    login.mockResolvedValue({
      status: "error",
      formError: "Email chưa được xác minh.",
      values: { email: "member@example.com" },
      verificationRequired: true,
    });

    render(<LoginForm next="/me" />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    const resendLink = await screen.findByRole("link", {
      name: "Gửi lại email xác minh",
    });
    expect(resendLink.getAttribute("href")).toBe(
      "/check-email?email=member%40example.com",
    );
  });

  it("shows field-level errors for an invalid email and short password", async () => {
    login.mockResolvedValue({
      status: "error",
      fieldErrors: {
        email: ["Hãy nhập một địa chỉ email hợp lệ."],
        password: ["Mật khẩu phải có ít nhất 6 ký tự."],
      },
      values: { email: "not-an-email" },
    });

    render(<LoginForm next="/me" />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(
      await screen.findByText("Hãy nhập một địa chỉ email hợp lệ."),
    ).toBeTruthy();
    expect(screen.getByText("Mật khẩu phải có ít nhất 6 ký tự.")).toBeTruthy();
  });

  it("disables the submit button while the login action is pending", async () => {
    let resolveLogin!: (value: unknown) => void;
    login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<LoginForm next="/me" />);
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    const pendingButton = await screen.findByRole("button", {
      name: "Đang đăng nhập…",
    });
    expect(pendingButton).toBeDisabled();

    resolveLogin({ status: "idle" });
    expect(
      await screen.findByRole("button", { name: "Đăng nhập" }),
    ).not.toBeDisabled();
  });
});
