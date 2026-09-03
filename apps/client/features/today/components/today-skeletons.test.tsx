// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TodayBoardSkeleton, TodayMetaSkeleton } from "./today-skeletons";

afterEach(cleanup);

describe("TodayBoardSkeleton", () => {
  it("announces its loading state", () => {
    render(<TodayBoardSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải những thực hành hôm nay…",
    );
  });
});

describe("TodayMetaSkeleton", () => {
  it("announces its loading state", () => {
    render(<TodayMetaSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải thông tin hôm nay…",
    );
  });
});
