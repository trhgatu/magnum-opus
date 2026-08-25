// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HabitHeatmap } from "./habit-heatmap";

describe("HabitHeatmap", () => {
  it("renders an accessible summary without recalculating owner dates", () => {
    render(
      <HabitHeatmap
        history={{
          habitId: "habit",
          from: "2026-08-23",
          to: "2026-08-25",
          dates: ["2026-08-23", "2026-08-25"],
        }}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "2 ngày đã hoàn thành từ 2026-08-23 đến 2026-08-25",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 lần hoàn thành trong khoảng đang hiển thị."),
    ).toBeInTheDocument();
  });
});
