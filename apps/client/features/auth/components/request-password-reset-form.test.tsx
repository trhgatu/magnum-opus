// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("../actions/auth", () => ({ requestPasswordReset }));

import { RequestPasswordResetForm } from "./request-password-reset-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RequestPasswordResetForm", () => {
  it("submits the email to the requestPasswordReset action", async () => {
    requestPasswordReset.mockResolvedValue({ status: "idle" });

    render(<RequestPasswordResetForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "member@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi liên kết đặt lại" }),
    );

    await vi.waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledTimes(1),
    );
    const formData = requestPasswordReset.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("member@example.com");
  });

  it("shows a success message and a link back to login once accepted", async () => {
    requestPasswordReset.mockResolvedValue({ status: "success" });

    render(<RequestPasswordResetForm />);
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi liên kết đặt lại" }),
    );

    expect(
      await screen.findByText(/đã gửi một liên kết có hiệu lực/),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Quay lại đăng nhập" }),
    ).toBeTruthy();
  });

  it("shows a field error for an invalid email", async () => {
    requestPasswordReset.mockResolvedValue({
      status: "error",
      fieldErrors: { email: ["Hãy nhập một địa chỉ email hợp lệ."] },
      values: { email: "not-an-email" },
    });

    render(<RequestPasswordResetForm />);
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi liên kết đặt lại" }),
    );

    expect(
      await screen.findByText("Hãy nhập một địa chỉ email hợp lệ."),
    ).toBeTruthy();
  });

  it("shows the form-level error on an upstream failure", async () => {
    requestPasswordReset.mockResolvedValue({
      status: "error",
      formError: "Dịch vụ đang tạm thời gặp sự cố. Vui lòng thử lại.",
      values: { email: "member@example.com" },
    });

    render(<RequestPasswordResetForm />);
    fireEvent.click(
      screen.getByRole("button", { name: "Gửi liên kết đặt lại" }),
    );

    expect(
      await screen.findByText(
        "Dịch vụ đang tạm thời gặp sự cố. Vui lòng thử lại.",
      ),
    ).toBeTruthy();
  });
});
