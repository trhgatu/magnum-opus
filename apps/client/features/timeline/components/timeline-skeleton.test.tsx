// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimelineListSkeleton, TimelineSkeleton } from "./timeline-skeleton";

afterEach(cleanup);

describe("TimelineSkeleton", () => {
  it("announces its loading state", () => {
    render(<TimelineSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải Dòng thời gian…",
    );
  });

  it("announces the list-only loading state", () => {
    render(<TimelineListSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải Dòng thời gian…",
    );
  });
});
