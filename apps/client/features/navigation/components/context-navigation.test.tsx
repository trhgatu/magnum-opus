// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextNavigation } from "@/features/navigation/components/context-navigation";

const navigation = vi.hoisted(() => ({ pathname: "/journal/entry-id" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("ContextNavigation", () => {
  beforeEach(() => {
    navigation.pathname = "/journal/entry-id";
  });

  afterEach(() => cleanup());

  it("opens the active product space and marks its capability", () => {
    render(<ContextNavigation />);
    const activeSpace = screen
      .getByText("Phản chiếu")
      .closest("details") as HTMLDetailsElement;

    expect(activeSpace.open).toBe(true);
    expect(
      screen
        .getByRole("link", { name: "Journal" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("does not expose planned spaces as dead navigation", () => {
    render(<ContextNavigation />);

    expect(screen.queryByText("Engineering")).toBeNull();
    expect(screen.queryByRole("link", { name: "Projects" })).toBeNull();
  });

  it("notifies the mobile shell after choosing a capability", () => {
    const onNavigate = vi.fn();
    render(<ContextNavigation onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Memories" }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("provides accessible names and native hints for icon-only mode", () => {
    render(<ContextNavigation />);

    expect(screen.getByRole("link", { name: "Journal" }).title).toBe("Journal");
    expect(screen.getByRole("link", { name: "Memories" }).title).toBe(
      "Memories",
    );
  });
});
