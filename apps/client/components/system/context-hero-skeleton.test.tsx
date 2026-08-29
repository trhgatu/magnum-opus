// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContextHeroSkeleton } from "./context-hero-skeleton";

afterEach(cleanup);

describe("ContextHeroSkeleton", () => {
  it("renders with default props", () => {
    const { container } = render(<ContextHeroSkeleton />);
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });

  it("renders a meta pill for each entry in metaCount", () => {
    const { container } = render(<ContextHeroSkeleton metaCount={4} />);
    const metaContainer = container.querySelector(".mt-6.flex.gap-2");
    expect(metaContainer?.children).toHaveLength(4);
  });

  it("renders no meta pill section when metaCount is 0", () => {
    const { container } = render(<ContextHeroSkeleton metaCount={0} />);
    expect(container.querySelector(".mt-6.flex.gap-2")).not.toBeInTheDocument();
  });

  it("renders the actions skeleton when actions is true", () => {
    const { container } = render(<ContextHeroSkeleton actions />);
    expect(container.querySelector(".h-9.w-32")).toBeInTheDocument();
  });

  it("does not render the actions skeleton when actions is false", () => {
    const { container } = render(<ContextHeroSkeleton actions={false} />);
    expect(container.querySelector(".h-9.w-32")).not.toBeInTheDocument();
  });
});
