// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { register } = vi.hoisted(() => ({
  register: vi.fn(),
}));

vi.mock("../actions/auth", () => ({ register }));

import { RegisterForm } from "./register-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RegisterForm", () => {
  it("submits every field to the register action", async () => {
    register.mockResolvedValue({ status: "idle" });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), {
      target: { value: "member" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "a-strong-password" },
    });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
      target: { value: "a-strong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await vi.waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const formData = register.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("member@example.com");
    expect(formData.get("username")).toBe("member");
    expect(formData.get("password")).toBe("a-strong-password");
    expect(formData.get("confirmPassword")).toBe("a-strong-password");
  });

  it("shows the form-level error and preserves entered values", async () => {
    register.mockResolvedValue({
      status: "error",
      formError: "Email đã được sử dụng.",
      values: { email: "member@example.com", username: "member" },
    });

    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByText("Email đã được sử dụng.")).toBeTruthy();
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "member@example.com",
    );
    expect(
      (screen.getByLabelText("Tên hiển thị") as HTMLInputElement).value,
    ).toBe("member");
  });

  it("shows field-level errors for every invalid field", async () => {
    register.mockResolvedValue({
      status: "error",
      fieldErrors: {
        email: ["Email không hợp lệ."],
        username: ["Tên hiển thị cần ít nhất 3 ký tự."],
        password: ["Mật khẩu phải có ít nhất 12 ký tự."],
        confirmPassword: ["Hai mật khẩu chưa trùng nhau."],
      },
      values: { email: "x", username: "a" },
    });

    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByText("Email không hợp lệ.")).toBeTruthy();
    expect(screen.getByText("Tên hiển thị cần ít nhất 3 ký tự.")).toBeTruthy();
    expect(screen.getByText("Mật khẩu phải có ít nhất 12 ký tự.")).toBeTruthy();
    expect(screen.getByText("Hai mật khẩu chưa trùng nhau.")).toBeTruthy();
  });

  it("disables the submit button while the register action is pending", async () => {
    let resolveRegister!: (value: unknown) => void;
    register.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );

    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(
      await screen.findByRole("button", { name: "Đang tạo tài khoản…" }),
    ).toBeDisabled();

    resolveRegister({ status: "idle" });
    expect(
      await screen.findByRole("button", { name: "Tạo tài khoản" }),
    ).not.toBeDisabled();
  });
});
