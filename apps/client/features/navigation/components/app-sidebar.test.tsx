// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/features/navigation/components/app-sidebar";
import { SidebarProvider } from "@/features/navigation/components/sidebar-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal",
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("toggles between expanded and icon-only navigation", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );
    const control = screen.getByRole("button", {
      name: "Thu gọn hoặc mở rộng thanh điều hướng",
    });

    expect(control.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Personal system")).not.toBeNull();

    fireEvent.click(control);

    expect(control.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: "Nhật ký" })).not.toBeNull();
  });

  it("persists the collapsed preference across mounts", () => {
    const { unmount } = render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Thu gọn hoặc mở rộng thanh điều hướng",
      }),
    );
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("1");
    unmount();

    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: "Thu gọn hoặc mở rộng thanh điều hướng",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
