// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TodayBoardSkeleton } from "./today-skeletons";

afterEach(cleanup);

describe("TodayBoardSkeleton", () => {
  it("announces its loading state", () => {
    render(<TodayBoardSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải những thực hành hôm nay…",
    );
  });
});
