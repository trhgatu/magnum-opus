// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeaderBreadcrumb } from "@/features/navigation/components/header-breadcrumb";

const navigation = vi.hoisted(() => ({ pathname: "/journal" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("HeaderBreadcrumb", () => {
  afterEach(() => cleanup());

  it("shows the matching space and item labels for a nested route", () => {
    navigation.pathname = "/journal/some-entry-id";
    render(<HeaderBreadcrumb />);

    expect(screen.getByText("Phản chiếu")).not.toBeNull();
    expect(screen.getByText("Nhật ký")).not.toBeNull();
  });

  it("shows a known extra route label outside product navigation", () => {
    navigation.pathname = "/me";
    render(<HeaderBreadcrumb />);

    expect(screen.getByText("Tài khoản")).not.toBeNull();
  });

  it("falls back to a generic label for an unmatched route", () => {
    navigation.pathname = "/somewhere-unknown";
    render(<HeaderBreadcrumb />);

    expect(screen.getByText("Không gian riêng")).not.toBeNull();
  });
});
