import type {
  ActivitySourceResponse,
  CycleActivityResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  dayDescription,
  divergenceText,
  formatRecent,
  freshnessLine,
  sourceErrorLines,
  summaryLine,
} from "./activity-presentation";

const NOW = new Date("2026-10-18T07:40:00.000Z"); // 14:40 ở Việt Nam
const TZ = "Asia/Ho_Chi_Minh";

const cycle = (
  overrides: Partial<CycleActivityResponse> = {},
): CycleActivityResponse => ({
  cycleId: "cycle-1",
  cycleNumber: 3,
  startedAt: "2026-10-01T00:00:00.000Z",
  metrics: {
    activeDays: 8,
    pausedActiveDays: 0,
    commits: 23,
    prsOpened: 4,
    prsMerged: 3,
  },
  lastActivityAt: "2026-10-18T07:20:00.000Z",
  days: [
    { date: "2026-10-17", state: "ACTIVE" },
    { date: "2026-10-18", state: "IDLE" },
  ],
  hasMissingData: false,
  dataUntil: "2026-10-18T07:32:00.000Z",
  ...overrides,
});

const source = (
  overrides: Partial<ActivitySourceResponse> = {},
): ActivitySourceResponse => ({
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
  ...overrides,
});

describe("summaryLine", () => {
  it("lists active days, commits and pull requests", () => {
    expect(summaryLine(cycle())).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge",
    );
  });

  it("says how many of those days were while paused, and keeps zeros", () => {
    expect(
      summaryLine(
        cycle({
          metrics: {
            activeDays: 8,
            pausedActiveDays: 2,
            commits: 1024,
            prsOpened: 0,
            prsMerged: 0,
          },
        }),
      ),
    ).toBe(
      "8 ngày có hoạt động (2 ngày lúc tạm dừng) · 1.024 commit · 0 PR mở · 0 PR merge",
    );
  });

  it("tells no activity apart from no data", () => {
    const none = {
      activeDays: 0,
      pausedActiveDays: 0,
      commits: 0,
      prsOpened: 0,
      prsMerged: 0,
    };
    expect(summaryLine(cycle({ metrics: none }))).toBe(
      "Chưa có hoạt động trong vòng này.",
    );
    expect(
      summaryLine(
        cycle({
          metrics: none,
          days: [
            { date: "2026-10-17", state: "NO_DATA" },
            { date: "2026-10-18", state: "NO_DATA" },
          ],
        }),
      ),
    ).toBe("Chưa có dữ liệu hoạt động cho vòng này.");
  });

  it("flags missing data reported by a stale source", () => {
    expect(summaryLine(cycle({ hasMissingData: true }))).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge (một số ngày chưa có dữ liệu)",
    );
  });

  it("flags days without data next to a normal line", () => {
    expect(
      summaryLine(
        cycle({
          days: [
            { date: "2026-10-17", state: "NO_DATA" },
            { date: "2026-10-18", state: "ACTIVE" },
          ],
        }),
      ),
    ).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge (một số ngày chưa có dữ liệu)",
    );
  });
});

describe("formatRecent", () => {
  it("finds yesterday by calendar day across a daylight-saving change", () => {
    // New York lùi giờ 01/11/2026: ngày đó dài 25 giờ.
    const now = new Date("2026-11-02T04:30:00.000Z"); // 23:30 ngày 01/11
    expect(
      formatRecent("2026-10-31T14:00:00.000Z", "America/New_York", now),
    ).toBe("hôm qua, 10:00");
  });

  it("says today, yesterday, or the date — in the account time zone", () => {
    expect(formatRecent("2026-10-18T07:20:00.000Z", TZ, NOW)).toBe(
      "hôm nay, 14:20",
    );
    expect(formatRecent("2026-10-17T14:05:00.000Z", TZ, NOW)).toBe(
      "hôm qua, 21:05",
    );
    expect(formatRecent("2026-10-12T02:30:00.000Z", TZ, NOW)).toBe(
      "12/10, 09:30",
    );
  });
});

describe("freshnessLine", () => {
  it("shows the last activity and the earliest update across sources", () => {
    expect(
      freshnessLine(
        cycle(),
        [
          source({ lastSyncAt: "2026-10-18T07:32:00.000Z" }),
          source({ feedId: "feed-2", lastSyncAt: "2026-10-18T07:10:00.000Z" }),
        ],
        TZ,
        NOW,
      ),
    ).toBe("Hoạt động gần nhất: hôm nay, 14:20 · Cập nhật lúc 14:10");
  });

  it("says when the earliest update was not today", () => {
    expect(
      freshnessLine(
        cycle({ lastActivityAt: null }),
        [source({ lastSyncAt: "2026-10-17T14:05:00.000Z" })],
        TZ,
        NOW,
      ),
    ).toBe("Cập nhật hôm qua, 21:05");
  });

  it("has nothing to say without activity or updates", () => {
    expect(
      freshnessLine(
        cycle({ lastActivityAt: null }),
        [source({ lastSyncAt: null })],
        TZ,
        NOW,
      ),
    ).toBeNull();
  });
});

describe("sourceErrorLines", () => {
  it("names each failing source with its fix", () => {
    expect(
      sourceErrorLines([
        source(),
        source({
          displayName: "trhgatu/old-repo",
          error: { code: "GITHUB_TOKEN_EXPIRED" },
        }),
      ]),
    ).toEqual(["trhgatu/old-repo: token đã hết hạn — cập nhật ở Cài đặt."]);
  });
});

describe("day strip helpers", () => {
  it("describes a day for screen readers", () => {
    expect(dayDescription({ date: "2026-10-08", state: "PAUSED_ACTIVE" })).toBe(
      "08/10: có hoạt động lúc tạm dừng",
    );
  });
});

describe("divergenceText", () => {
  it("uses the BA wording for each divergence", () => {
    expect(
      divergenceText({ kind: "PAUSED_WITH_ACTIVITY", activeDays: 2 }, TZ),
    ).toBe("Có hoạt động trong 2 ngày dù đang tạm dừng.");
    expect(
      divergenceText({ kind: "ACTIVE_WITHOUT_ACTIVITY", idleDays: 7 }, TZ),
    ).toBe("Đã 7 ngày chưa có hoạt động.");
    expect(
      divergenceText(
        {
          kind: "ACTIVITY_BEFORE_START",
          lastActivityAt: "2026-10-14T00:00:00.000Z",
        },
        TZ,
      ),
    ).toBe("Đã có hoạt động dù Project chưa bắt đầu.");
  });

  it("counts commits alone, or all activity once pull requests are in", () => {
    expect(
      divergenceText(
        {
          kind: "ACTIVITY_AFTER_CLOSE",
          closedAs: "COMPLETED",
          commits: 4,
          otherEvents: 0,
          lastActivityAt: "2026-10-14T03:00:00.000Z",
        },
        TZ,
      ),
    ).toBe("4 commit kể từ khi hoàn thành (gần nhất 14/10).");
    expect(
      divergenceText(
        {
          kind: "ACTIVITY_AFTER_CLOSE",
          closedAs: "STOPPED",
          commits: 4,
          otherEvents: 2,
          lastActivityAt: "2026-10-14T03:00:00.000Z",
        },
        TZ,
      ),
    ).toBe("6 hoạt động kể từ khi dừng (gần nhất 14/10).");
  });
});
