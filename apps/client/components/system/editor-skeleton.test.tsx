// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EditorSkeleton } from "./editor-skeleton";

afterEach(cleanup);

describe("EditorSkeleton", () => {
  it("announces loading state for assistive technology", () => {
    render(<EditorSkeleton />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Đang mở entry…")).not.toBeNull();
  });

  it("marks the decorative placeholder blocks as aria-hidden", () => {
    const { container } = render(<EditorSkeleton />);

    const hiddenGroups = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenGroups.length).toBeGreaterThan(0);

    const skeletonsInsideHiddenGroups = Array.from(hiddenGroups).flatMap(
      (group) => Array.from(group.querySelectorAll('[data-slot="skeleton"]')),
    );
    expect(skeletonsInsideHiddenGroups.length).toBe(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    );
  });
});
