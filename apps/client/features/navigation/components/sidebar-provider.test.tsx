// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SidebarProvider,
  useSidebar,
} from "@/features/navigation/components/sidebar-provider";

function Harness() {
  const { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile } =
    useSidebar();

  return (
    <div>
      <p>collapsed:{String(collapsed)}</p>
      <p>mobileOpen:{String(mobileOpen)}</p>
      <button type="button" onClick={toggleCollapsed}>
        toggle collapsed
      </button>
      <button type="button" onClick={openMobile}>
        open mobile
      </button>
      <button type="button" onClick={closeMobile}>
        close mobile
      </button>
    </div>
  );
}

describe("SidebarProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("defaults to expanded and closed", () => {
    render(
      <SidebarProvider>
        <Harness />
      </SidebarProvider>,
    );

    expect(screen.getByText("collapsed:false")).not.toBeNull();
    expect(screen.getByText("mobileOpen:false")).not.toBeNull();
  });

  it("toggles and persists the collapsed preference", () => {
    render(
      <SidebarProvider>
        <Harness />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByText("toggle collapsed"));

    expect(screen.getByText("collapsed:true")).not.toBeNull();
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("1");

    fireEvent.click(screen.getByText("toggle collapsed"));

    expect(screen.getByText("collapsed:false")).not.toBeNull();
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("0");
  });

  it("applies every toggle when several are batched before a rerender", () => {
    function DoubleToggle() {
      const { collapsed, toggleCollapsed } = useSidebar();

      return (
        <div>
          <p>collapsed:{String(collapsed)}</p>
          <button
            type="button"
            onClick={() => {
              toggleCollapsed();
              toggleCollapsed();
            }}
          >
            toggle twice
          </button>
        </div>
      );
    }

    render(
      <SidebarProvider>
        <DoubleToggle />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByText("toggle twice"));

    // Hai lần lật liên tiếp phải quay về trạng thái ban đầu.
    expect(screen.getByText("collapsed:false")).not.toBeNull();
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("0");
  });

  it("reads a previously persisted collapsed preference on mount", () => {
    window.localStorage.setItem("sidebar-collapsed", "1");

    render(
      <SidebarProvider>
        <Harness />
      </SidebarProvider>,
    );

    expect(screen.getByText("collapsed:true")).not.toBeNull();
  });

  it("opens and closes the mobile drawer state independently of collapsed", () => {
    render(
      <SidebarProvider>
        <Harness />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByText("open mobile"));
    expect(screen.getByText("mobileOpen:true")).not.toBeNull();

    fireEvent.click(screen.getByText("close mobile"));
    expect(screen.getByText("mobileOpen:false")).not.toBeNull();
  });

  it("throws when useSidebar is used outside the provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function Broken() {
      useSidebar();
      return null;
    }

    try {
      expect(() => render(<Broken />)).toThrow(
        "useSidebar must be used within a SidebarProvider",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
