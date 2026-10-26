// @vitest-environment jsdom

import type { CycleActivitySnapshotResponse } from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { snapshotSourceLines } from "@/features/project-activity/lib/activity-presentation";

import { CycleSnapshot } from "./cycle-snapshot";

afterEach(cleanup);

// Cycle đóng lúc 17:00 ngày 12/10 giờ Việt Nam.
const CLOSED_AT = "2026-10-12T10:00:00.000Z";

const snapshot = (
  overrides: Partial<CycleActivitySnapshotResponse> = {},
): CycleActivitySnapshotResponse => ({
  cycleId: "cycle-1",
  metrics: {
    activeDays: 8,
    pausedActiveDays: 2,
    commits: 23,
    prsOpened: 4,
    prsMerged: 3,

    codingSeconds: null,
  },
  lastActivityAt: "2026-10-12T09:00:00.000Z",
  days: [
    { date: "2026-10-11", state: "PAUSED_ACTIVE", codingSeconds: null },
    { date: "2026-10-12", state: "ACTIVE", codingSeconds: null },
  ],
  sources: [
    {
      provider: "GITHUB",
      displayName: "trhgatu/magnum-opus",
      coveredFrom: "2026-09-01T00:00:00.000Z",
      dataUntil: "2026-10-12T10:05:00.000Z",
    },
  ],
  timeZone: "Asia/Ho_Chi_Minh",
  dataUntil: "2026-10-12T10:05:00.000Z",
  capturedAt: "2026-10-12T10:05:00.000Z",
  ...overrides,
});

describe("snapshotSourceLines", () => {
  it("groups sources copied up to the close, at the close time", () => {
    expect(
      snapshotSourceLines(
        snapshot({
          sources: [
            ...snapshot().sources,
            {
              provider: "GITHUB",
              displayName: "trhgatu/docs",
              coveredFrom: null,
              dataUntil: CLOSED_AT,
            },
          ],
        }),
        CLOSED_AT,
      ),
    ).toEqual({
      lines: [
        "Nguồn: trhgatu/magnum-opus, trhgatu/docs · dữ liệu tới 12/10/2026 17:00",
      ],
      incomplete: false,
    });
  });

  it("says how far an incomplete source got, in the captured time zone", () => {
    expect(
      snapshotSourceLines(
        snapshot({
          timeZone: "UTC",
          sources: [
            ...snapshot().sources,
            {
              provider: "GITHUB",
              displayName: "trhgatu/old-repo",
              coveredFrom: null,
              dataUntil: "2026-10-11T09:00:00.000Z",
            },
            {
              provider: "GITHUB",
              displayName: "trhgatu/never",
              coveredFrom: null,
              dataUntil: null,
            },
          ],
        }),
        CLOSED_AT,
      ),
    ).toEqual({
      lines: [
        "Nguồn: trhgatu/magnum-opus · dữ liệu tới 12/10/2026 10:00",
        "trhgatu/old-repo — dữ liệu tới 11/10/2026 09:00",
        "trhgatu/never — chưa có dữ liệu",
      ],
      incomplete: true,
    });
  });
});

describe("snapshotSourceLines without a complete source", () => {
  it("has no shared line when every source stopped short", () => {
    expect(
      snapshotSourceLines(
        snapshot({
          sources: [
            {
              provider: "GITHUB",
              displayName: "trhgatu/old-repo",
              coveredFrom: null,
              dataUntil: "2026-10-11T02:00:00.000Z",
            },
          ],
        }),
        CLOSED_AT,
      ),
    ).toEqual({
      lines: ["trhgatu/old-repo — dữ liệu tới 11/10/2026 09:00"],
      incomplete: true,
    });
  });

  it("has nothing to say without sources", () => {
    expect(snapshotSourceLines(snapshot({ sources: [] }), CLOSED_AT)).toEqual({
      lines: [],
      incomplete: false,
    });
  });
});

describe("CycleSnapshot", () => {
  it("shows the captured strip, summary and sources", () => {
    render(
      <CycleSnapshot
        snapshot={snapshot()}
        cycleNumber={2}
        closedAt={CLOSED_AT}
      />,
    );

    const region = screen.getByRole("region", {
      name: "Hoạt động của Cycle 2",
    });
    expect(
      within(region).getByRole("list", { name: "Dải ngày của Cycle 2" }),
    ).toBeTruthy();
    expect(
      within(region)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["11/10: có hoạt động lúc tạm dừng", "12/10: có hoạt động"]);
    expect(
      within(region).getByText(
        "8 ngày có hoạt động (2 ngày lúc tạm dừng) · 23 commit · 4 PR mở · 3 PR merge",
      ),
    ).toBeTruthy();
    expect(
      within(region).getByText(
        "Nguồn: trhgatu/magnum-opus · dữ liệu tới 12/10/2026 17:00",
      ),
    ).toBeTruthy();
  });

  it("flags the summary when a source was not copied up to the close", () => {
    render(
      <CycleSnapshot
        snapshot={snapshot({
          sources: [
            {
              provider: "GITHUB",
              displayName: "trhgatu/old-repo",
              coveredFrom: null,
              dataUntil: "2026-10-11T02:00:00.000Z",
            },
          ],
        })}
        cycleNumber={2}
        closedAt={CLOSED_AT}
      />,
    );

    expect(
      screen.getByText(
        "8 ngày có hoạt động (2 ngày lúc tạm dừng) · 23 commit · 4 PR mở · 3 PR merge (một số ngày chưa có dữ liệu)",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("trhgatu/old-repo — dữ liệu tới 11/10/2026 09:00"),
    ).toBeTruthy();
  });
});
