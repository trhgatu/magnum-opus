// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal",
}));

vi.mock("@/features/auth/actions/auth", () => ({
  logout: vi.fn(),
}));

import { AccountShell } from "./account-shell";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  window.localStorage.clear();
});

afterEach(() => cleanup());

const user = { email: "vy@example.com", username: "vy" };

describe("AccountShell", () => {
  it("connects the desktop collapse toggle through the shared sidebar context", () => {
    render(<AccountShell user={user}>Nội dung</AccountShell>);

    const toggle = screen.getByRole("button", {
      name: "Thu gọn hoặc mở rộng thanh điều hướng",
    });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Personal system")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Personal system")).not.toBeInTheDocument();
  });

  it("connects the mobile drawer through the shared sidebar context", () => {
    render(<AccountShell user={user}>Nội dung</AccountShell>);

    fireEvent.click(screen.getByRole("button", { name: "Mở điều hướng" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("link", { name: "Nhật ký" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Đóng điều hướng" }));

    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });

  it("shows the current section in the header breadcrumb", () => {
    render(<AccountShell user={user}>Nội dung</AccountShell>);

    const header = within(screen.getByRole("banner"));
    const breadcrumb = header.getByTestId("header-breadcrumb");

    expect(breadcrumb).toHaveTextContent("Phản chiếu");
    expect(breadcrumb).toHaveTextContent("Nhật ký");
  });
});
