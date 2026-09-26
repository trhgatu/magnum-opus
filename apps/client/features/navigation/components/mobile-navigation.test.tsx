// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNavigation } from "@/features/navigation/components/mobile-navigation";
import { SidebarProvider } from "@/features/navigation/components/sidebar-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal",
}));

beforeEach(() => {
  // jsdom chưa hỗ trợ showModal()/close() thật — mock lại hành vi tối
  // thiểu (đổi thuộc tính `open`) để effect trong MobileNavigation có gì
  // đó thật sự để đồng bộ theo.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => cleanup());

describe("MobileNavigation", () => {
  it("opens the drawer through the shared sidebar context", () => {
    render(
      <SidebarProvider>
        <MobileNavigation />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở điều hướng" }));

    expect(screen.getByRole("link", { name: "Nhật ký" })).toBeInTheDocument();
  });

  it("closes the drawer via the close button", () => {
    render(
      <SidebarProvider>
        <MobileNavigation />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở điều hướng" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng điều hướng" }));

    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });

  it("closes the drawer after choosing a navigation link", () => {
    render(
      <SidebarProvider>
        <MobileNavigation />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở điều hướng" }));
    fireEvent.click(screen.getByRole("link", { name: "Nhật ký" }));

    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  });
});
