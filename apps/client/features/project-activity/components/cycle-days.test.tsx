// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ActivityDay, ActivityMetrics } from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  CycleMetrics,
  dayLabel,
  dayValue,
  RecentDays,
  shortCodingTime,
} from "./cycle-days";

afterEach(cleanup);

const day = (
  date: string,
  state: ActivityDay["state"] = "ACTIVE",
  codingSeconds: number | null = null,
  commits: number | null = null,
): ActivityDay => ({ date, state, codingSeconds, commits });

const metrics: ActivityMetrics = {
  activeDays: 4,
  pausedActiveDays: 0,
  commits: 17,
  prsOpened: 3,
  prsMerged: 1,
  codingSeconds: 23_040,
};

describe("day text", () => {
  it("labels a day with its weekday and date", () => {
    // 2026-10-29 là Thứ Năm.
    expect(dayLabel("2026-10-29")).toBe("T5 29/10");
    expect(dayLabel("2026-11-01")).toBe("CN 01/11");
  });

  it("shows coding time, rounded down, or the day state", () => {
    expect(shortCodingTime(4_300)).toBe("1,1 giờ");
    expect(shortCodingTime(2_400)).toBe("40 phút");
    expect(shortCodingTime(20)).toBe("dưới 1 phút");
    expect(dayValue(day("2026-10-29", "ACTIVE", 9_000))).toBe("2,5 giờ");
    expect(dayValue(day("2026-10-29", "ACTIVE"))).toBe("có hoạt động");
    expect(dayValue(day("2026-10-29", "IDLE", 0))).toBe("không hoạt động");
    expect(dayValue(day("2026-10-29", "NO_DATA"))).toBe("chưa có dữ liệu");
  });

  it("adds the commits of the day", () => {
    expect(dayValue(day("2026-10-29", "ACTIVE", null, 3))).toBe("3 commit");
    expect(dayValue(day("2026-10-29", "ACTIVE", 9_000, 4))).toBe(
      "2,5 giờ · 4 commit",
    );
    // 0 commit không đáng ghi: ngày đó chỉ có giờ code.
    expect(dayValue(day("2026-10-29", "ACTIVE", 9_000, 0))).toBe("2,5 giờ");
    expect(dayValue(day("2026-10-29", "IDLE", null, 0))).toBe(
      "không hoạt động",
    );
  });
});

describe("RecentDays", () => {
  it("keeps the last seven days and names today", () => {
    const days = Array.from({ length: 9 }, (_, index) =>
      day(
        new Date(Date.UTC(2026, 9, 24 + index)).toISOString().slice(0, 10),
        "IDLE",
      ),
    );

    render(<RecentDays days={days} today="2026-11-01" />);

    const items = within(
      screen.getByRole("list", { name: "Từng ngày gần đây của vòng này" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("T2 26/10");
    expect(items[6]).toHaveTextContent("hôm nay");
  });

  it("shades GitHub-only days by their commits", () => {
    render(
      <RecentDays
        days={[
          day("2026-10-30", "ACTIVE", null, 1),
          day("2026-10-31", "ACTIVE", null, 6),
        ]}
        today="2026-11-01"
      />,
    );

    const tiles = within(
      screen.getByRole("list", { name: "Từng ngày gần đây của vòng này" }),
    )
      .getAllByRole("listitem")
      .map((item) => item.querySelector("[aria-hidden]")!.className);
    expect(tiles[0]).toContain("bg-ember/40");
    expect(tiles[1]).toMatch(/bg-ember(\s|$)/);
  });

  it("shades commit-only days by commits next to days with coding time", () => {
    // Project gắn cả WakaTime lẫn GitHub: 31/10 chỉ có commit, không code.
    render(
      <RecentDays
        days={[
          day("2026-10-29", "ACTIVE", 9_000, 1),
          day("2026-10-30", "ACTIVE", 0, 1),
          day("2026-10-31", "ACTIVE", 0, 6),
        ]}
        today="2026-11-01"
      />,
    );

    const tiles = within(
      screen.getByRole("list", { name: "Từng ngày gần đây của vòng này" }),
    )
      .getAllByRole("listitem")
      .map((item) => item.querySelector("[aria-hidden]")!.className);
    expect(tiles[0]).toMatch(/bg-ember(\s|$)/);
    expect(tiles[1]).toContain("bg-ember/40");
    expect(tiles[2]).toMatch(/bg-ember(\s|$)/);
  });

  it("renders nothing for a cycle without days", () => {
    const { container } = render(<RecentDays days={[]} today="2026-11-01" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("CycleMetrics", () => {
  it("shows active days, commits and coding hours", () => {
    render(<CycleMetrics metrics={metrics} hasGitHub />);

    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    const values = screen
      .getAllByRole("definition")
      .map((value) => value.textContent);
    expect(terms).toEqual(["ngày có hoạt động", "commit", "giờ code"]);
    expect(values).toEqual(["4", "17", "6,4"]);
  });

  it("leaves out commits without GitHub and hours without WakaTime", () => {
    render(
      <CycleMetrics
        metrics={{ ...metrics, codingSeconds: null }}
        hasGitHub={false}
      />,
    );

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      ["ngày có hoạt động"],
    );
  });
});
