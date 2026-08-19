// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleSkeleton } from "./article-skeleton";

afterEach(cleanup);

describe("ArticleSkeleton", () => {
  it("announces loading state for assistive technology", () => {
    render(<ArticleSkeleton />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Đang tải ký ức…")).not.toBeNull();
  });
});
