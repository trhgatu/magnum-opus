// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineSkeleton } from "./timeline-skeleton";

describe("TimelineSkeleton", () => {
  it("announces its loading state", () => {
    render(<TimelineSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải Timeline…");
  });
});
