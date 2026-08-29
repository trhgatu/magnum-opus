// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimelineSkeleton } from "./timeline-skeleton";

afterEach(cleanup);

describe("TimelineSkeleton", () => {
  it("announces its loading state", () => {
    render(<TimelineSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải Dòng thời gian…",
    );
  });
});
