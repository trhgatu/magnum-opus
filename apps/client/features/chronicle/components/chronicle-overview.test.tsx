// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ChronicleResponse } from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChronicleOverview } from "./chronicle-overview";

afterEach(cleanup);

const chronicle = (
  overrides: Partial<ChronicleResponse> = {},
): ChronicleResponse => ({
  year: 2026,
  month: 9,
  computedAt: "2026-10-09T15:13:00.000Z",
  habit: {
    buildCompletionRate: 39 / 43,
    bestStreak: { habitTitle: "Đọc sách", days: 20 },
    mostConsistentHabit: { habitTitle: "Đọc sách", completionRate: 28 / 30 },
    quitHabits: [{ habitTitle: "Thuốc lá", daysSinceLastRelapse: 18 }],
  },
  routine: { completionRate: 26 / 30 },
  project: { activeCount: 3, completedCount: 1, stoppedCount: 1 },
  journal: { entryCount: 9 },
  mood: { dominantMood: "CALM", distribution: { CALM: 4, JOYFUL: 2 } },
  memory: { memoryCount: 3 },
  ...overrides,
});

describe("ChronicleOverview", () => {
  it("groups the sections by space", () => {
    render(<ChronicleOverview chronicle={chronicle()} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Duy trì" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Theo đuổi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ghi lại" }),
    ).toBeInTheDocument();
  });

  it("shows habit and routine rates with accessible bars", () => {
    render(<ChronicleOverview chronicle={chronicle()} />);

    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Tỷ lệ hoàn thành thói quen: 91%" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Tỷ lệ buổi Nếp sinh hoạt hoàn thành: 87%",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Đọc sách · 20 ngày")).toBeInTheDocument();
    expect(screen.getByText("Đọc sách · 93%")).toBeInTheDocument();
    expect(
      screen.getByText("Thuốc lá · 18 ngày không tái phạm"),
    ).toBeInTheDocument();
  });

  it("shows project, journal, memory counts and the dominant mood", () => {
    render(<ChronicleOverview chronicle={chronicle()} />);

    expect(screen.getByText("Đang chạy").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("bài đã viết").previousSibling).toHaveTextContent(
      "9",
    );
    expect(screen.getByText("ký ức đã lưu").previousSibling).toHaveTextContent(
      "3",
    );
    expect(screen.getByText(/Nhiều nhất:/).parentElement).toHaveTextContent(
      "Nhiều nhất: ◌ Bình yên",
    );
    expect(
      screen.getByRole("img", { name: "Phân bố tâm trạng: Vui 2, Bình yên 4" }),
    ).toBeInTheDocument();
  });

  it("falls back gracefully for an empty month", () => {
    render(
      <ChronicleOverview
        chronicle={chronicle({
          habit: {
            buildCompletionRate: 0,
            bestStreak: null,
            mostConsistentHabit: null,
            quitHabits: [],
          },
          mood: { dominantMood: null, distribution: {} },
        })}
      />,
    );

    expect(screen.getAllByText("Chưa có")).toHaveLength(2);
    expect(screen.queryByText("Đang bỏ")).not.toBeInTheDocument();
    expect(
      screen.getByText("Chưa ghi tâm trạng nào trong tháng này."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /Phân bố tâm trạng/ }),
    ).not.toBeInTheDocument();
  });
});
