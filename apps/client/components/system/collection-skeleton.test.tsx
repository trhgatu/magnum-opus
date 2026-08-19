// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CollectionSkeleton } from "./collection-skeleton";

afterEach(cleanup);

describe("CollectionSkeleton", () => {
  it("announces loading state and renders the real page heading", () => {
    render(
      <CollectionSkeleton
        eyebrow="Reflection"
        title="Journal"
        description="Một nơi riêng tư để giữ lại điều đang sống động."
      />,
    );

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("heading", { name: "Journal" })).not.toBeNull();
  });

  it("renders exactly cardCount placeholder cards plus the toolbar/action placeholders", () => {
    const { container } = render(
      <CollectionSkeleton
        eyebrow="Reflection"
        title="Memories"
        description="Những khoảnh khắc đã thực sự được sống."
        cardCount={3}
      />,
    );

    // 1 action placeholder + 2 toolbar placeholders (search, filter) + 3 cards.
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      6,
    );
  });
});
