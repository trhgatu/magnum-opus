// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeaderBreadcrumb } from "@/features/navigation/components/header-breadcrumb";

const navigation = vi.hoisted(() => ({ pathname: "/journal" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("HeaderBreadcrumb", () => {
  afterEach(() => cleanup());

  it("exposes the matching space and current item as breadcrumb navigation", () => {
    navigation.pathname = "/journal/some-entry-id";
    render(<HeaderBreadcrumb />);

    const breadcrumb = screen.getByRole("navigation", {
      name: "Vị trí hiện tại",
    });
    expect(breadcrumb).toHaveTextContent("Phản chiếu");
    expect(screen.getByText("Nhật ký")).toHaveAttribute("aria-current", "page");
  });

  it("marks a known extra route outside product navigation as the current page", () => {
    navigation.pathname = "/me";
    render(<HeaderBreadcrumb />);

    expect(
      screen.getByRole("navigation", { name: "Vị trí hiện tại" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tài khoản")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("falls back to a plain generic label, not breadcrumb navigation, for an unmatched route", () => {
    navigation.pathname = "/somewhere-unknown";
    render(<HeaderBreadcrumb />);

    expect(screen.getByText("Không gian riêng")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
