// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/features/navigation/components/app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal",
}));

describe("AppSidebar", () => {
  afterEach(() => cleanup());

  it("toggles between expanded and icon-only navigation", () => {
    render(<AppSidebar />);
    const control = screen.getByRole("checkbox", {
      name: "Thu gọn hoặc mở rộng thanh điều hướng",
    }) as HTMLInputElement;

    expect(control.checked).toBe(false);
    expect(screen.getByText("Personal system")).not.toBeNull();

    control.click();

    expect(control.checked).toBe(true);
    expect(screen.getByRole("link", { name: "Nhật ký" })).not.toBeNull();
  });
});
