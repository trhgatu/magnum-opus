// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  HabitCollectionSkeleton,
  HabitDetailSkeleton,
  HabitFormSkeleton,
  HabitListSkeleton,
  HabitSummarySkeleton,
} from "./habit-skeletons";

afterEach(cleanup);

describe("Habit skeletons", () => {
  it.each([
    [
      <HabitCollectionSkeleton key="collection" />,
      "Đang tải danh sách Thói quen…",
    ],
    [<HabitDetailSkeleton key="detail" />, "Đang tải Thói quen…"],
    [<HabitFormSkeleton key="form" />, "Đang chuẩn bị biểu mẫu Thói quen…"],
    [<HabitListSkeleton key="list" />, "Đang tải danh sách Thói quen…"],
    [<HabitSummarySkeleton key="summary" />, "Đang tải tóm tắt hôm nay…"],
  ])("announces its loading state", (skeleton, announcement) => {
    render(skeleton);
    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });
});
