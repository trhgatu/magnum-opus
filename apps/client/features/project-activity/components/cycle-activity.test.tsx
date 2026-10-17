// @vitest-environment jsdom

import type {
  ActivityDay,
  CycleActivityResponse,
  ProjectActivityResponse,
} from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActivityDivergenceNotes, CycleActivity } from "./cycle-activity";
import {
  ActivityDivergencePanel,
  CycleActivityPanel,
} from "./project-activity-panel";

afterEach(cleanup);

const NOW = new Date("2026-10-18T07:40:00.000Z");

const cycle: CycleActivityResponse = {
  cycleId: "cycle-1",
  cycleNumber: 3,
  startedAt: "2026-10-15T00:00:00.000Z",
  metrics: {
    activeDays: 2,
    pausedActiveDays: 1,
    commits: 5,
    prsOpened: 1,
    prsMerged: 0,
  },
  lastActivityAt: "2026-10-18T07:20:00.000Z",
  days: [
    { date: "2026-10-15", state: "ACTIVE" },
    { date: "2026-10-16", state: "PAUSED_ACTIVE" },
    { date: "2026-10-17", state: "PAUSED_IDLE" },
    { date: "2026-10-18", state: "PAUSED_IDLE" },
  ],
  hasMissingData: false,
  dataUntil: "2026-10-18T07:32:00.000Z",
};

const activity = (
  overrides: Partial<ProjectActivityResponse> = {},
): ProjectActivityResponse => ({
  projectId: "project-1",
  timeZone: "Asia/Ho_Chi_Minh",
  sources: [
    {
      feedId: "feed-1",
      provider: "GITHUB",
      externalResourceId: "1001",
      displayName: "trhgatu/magnum-opus",
      status: "ACTIVE",
      linkedAt: "2026-10-01T00:00:00.000Z",
      lastSyncAt: "2026-10-18T07:32:00.000Z",
      coveredFrom: null,
      syncedUntil: null,
      error: null,
    },
  ],
  currentCycle: cycle,
  divergences: [],
  ...overrides,
});

const resume = <button type="button">Tiếp tục</button>;

describe("CycleActivity", () => {
  it("shows the day strip, a legend of the states present and the summary", () => {
    render(
      <CycleActivity
        activity={activity()}
        cycle={cycle}
        now={NOW}
        resumeAction={resume}
      />,
    );

    const strip = screen.getByRole("list", { name: "Các ngày của Cycle 3" });
    const days = within(strip).getAllByRole("listitem");
    expect(days.map((day) => day.textContent)).toEqual([
      "15/10: có hoạt động",
      "16/10: có hoạt động lúc tạm dừng",
      "17/10: tạm dừng",
      "18/10: tạm dừng",
    ]);
    expect(
      within(screen.getByRole("list", { name: "Chú thích" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Có hoạt động", "Có hoạt động lúc tạm dừng", "Tạm dừng"]);
    expect(
      screen.getByText(
        "2 ngày có hoạt động (1 ngày lúc tạm dừng) · 5 commit · 1 PR mở · 0 PR merge",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Hoạt động gần nhất: hôm nay, 14:20 · Cập nhật lúc 14:32",
      ),
    ).toBeTruthy();
  });

  it("wraps long cycles into weekly rows", () => {
    const days: ActivityDay[] = Array.from({ length: 71 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      state: "IDLE",
    }));
    render(
      <CycleActivity
        activity={activity()}
        cycle={{ ...cycle, days }}
        now={NOW}
        resumeAction={resume}
      />,
    );

    expect(
      screen.getByRole("list", { name: "Các ngày của Cycle 3" }).className,
    ).toContain("grid-cols-7");
  });

  it("offers Resume only with the paused-with-activity reminder", () => {
    const { rerender } = render(
      <CycleActivity
        activity={activity()}
        cycle={cycle}
        now={NOW}
        resumeAction={resume}
      />,
    );
    expect(screen.queryByRole("button", { name: "Tiếp tục" })).toBeNull();

    rerender(
      <CycleActivity
        activity={activity({
          divergences: [{ kind: "PAUSED_WITH_ACTIVITY", activeDays: 2 }],
        })}
        cycle={cycle}
        now={NOW}
        resumeAction={resume}
      />,
    );
    const note = screen.getByRole("note");
    expect(note.textContent).toContain(
      "Có hoạt động trong 2 ngày dù đang tạm dừng.",
    );
    expect(within(note).getByRole("button", { name: "Tiếp tục" })).toBeTruthy();
  });

  it("adds the idle reminder and source errors without blocking anything", () => {
    render(
      <CycleActivity
        activity={activity({
          sources: [
            {
              ...activity().sources[0]!,
              displayName: "trhgatu/old-repo",
              error: { code: "GITHUB_TOKEN_EXPIRED" },
            },
          ],
          divergences: [{ kind: "ACTIVE_WITHOUT_ACTIVITY", idleDays: 7 }],
        })}
        cycle={cycle}
        now={NOW}
        resumeAction={resume}
      />,
    );

    expect(screen.getByText("Đã 7 ngày chưa có hoạt động.")).toBeTruthy();
    expect(
      screen.getByText(
        "trhgatu/old-repo: token đã hết hạn — cập nhật ở Cài đặt.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ActivityDivergenceNotes", () => {
  it("shows only the notes that belong under the header", () => {
    render(
      <ActivityDivergenceNotes
        activity={activity({
          divergences: [
            { kind: "ACTIVE_WITHOUT_ACTIVITY", idleDays: 7 },
            {
              kind: "ACTIVITY_AFTER_CLOSE",
              closedAs: "COMPLETED",
              commits: 4,
              otherEvents: 0,
              lastActivityAt: "2026-10-14T03:00:00.000Z",
            },
          ],
        })}
      />,
    );

    expect(screen.getAllByRole("note").map((note) => note.textContent)).toEqual(
      ["4 commit kể từ khi hoàn thành (gần nhất 14/10)."],
    );
  });
});

describe("activity panels", () => {
  it("says the activity could not be loaded, and nothing else", async () => {
    render(
      await CycleActivityPanel({
        activity: Promise.resolve(null),
        resumeAction: resume,
      }),
    );
    expect(
      screen.getByText(
        "Chưa tải được hoạt động của vòng này. Tải lại trang để thử lại.",
      ),
    ).toBeTruthy();
    expect(
      await ActivityDivergencePanel({ activity: Promise.resolve(null) }),
    ).toBeNull();
  });

  it("stays out of the way when the project has no sources", async () => {
    expect(
      await CycleActivityPanel({
        activity: Promise.resolve(activity({ sources: [] })),
        resumeAction: resume,
      }),
    ).toBeNull();
  });
});
