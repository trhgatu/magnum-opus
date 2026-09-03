// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resendEmailVerification } = vi.hoisted(() => ({
  resendEmailVerification: vi.fn(),
}));

vi.mock("../actions/auth", () => ({ resendEmailVerification }));

import { ResendVerificationForm } from "./resend-verification-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ResendVerificationForm", () => {
  it("defaults the email field to the address passed in", () => {
    render(<ResendVerificationForm email="member@example.com" />);

    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "member@example.com",
    );
  });

  it("submits the email to the resendEmailVerification action", async () => {
    resendEmailVerification.mockResolvedValue({ status: "idle" });

    render(<ResendVerificationForm email="member@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại liên kết" }));

    await vi.waitFor(() =>
      expect(resendEmailVerification).toHaveBeenCalledTimes(1),
    );
    const formData = resendEmailVerification.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("member@example.com");
  });

  it("shows a success message and a link back to login once sent", async () => {
    resendEmailVerification.mockResolvedValue({ status: "success" });

    render(<ResendVerificationForm email="member@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại liên kết" }));

    expect(
      await screen.findByText(
        "Nếu tài khoản cần xác minh, một liên kết mới đã được gửi.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toBeTruthy();
  });

  it("shows a field error and keeps the corrected value over the initial prop", async () => {
    resendEmailVerification.mockResolvedValue({
      status: "error",
      fieldErrors: { email: ["Email không hợp lệ."] },
      values: { email: "fixed@example.com" },
    });

    render(<ResendVerificationForm email="member@example.com" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fixed@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại liên kết" }));

    expect(await screen.findByText("Email không hợp lệ.")).toBeTruthy();
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
      "fixed@example.com",
    );
  });
});
