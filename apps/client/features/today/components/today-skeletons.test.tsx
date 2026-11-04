// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  TodayPageSkeleton,
  TodayRhythmSkeleton,
  TodaySummarySkeleton,
} from "./today-skeletons";

afterEach(cleanup);

describe("Today skeletons", () => {
  it.each([
    [<TodayRhythmSkeleton key="rhythm" />, "Đang tải nhịp hôm nay…"],
    [<TodaySummarySkeleton key="summary" />, "Đang tải tóm tắt hôm nay…"],
    [<TodayPageSkeleton key="page" />, "Đang tải nhịp hôm nay…"],
  ])("announces its loading state", (skeleton, announcement) => {
    render(skeleton);
    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });
});
