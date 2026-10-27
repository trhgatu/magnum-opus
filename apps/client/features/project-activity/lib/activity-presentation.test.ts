import type {
  ActivityMetrics,
  ActivityProvider,
  ActivitySourceResponse,
  CycleActivityResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  dayDescription,
  divergenceText,
  formatCodingTime,
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

    codingSeconds: null,
  },
  lastActivityAt: "2026-10-18T07:20:00.000Z",
  days: [
    { date: "2026-10-17", state: "ACTIVE", codingSeconds: null },
    { date: "2026-10-18", state: "IDLE", codingSeconds: null },
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

const summary = (
  value: CycleActivityResponse,
  providers: ActivityProvider[] = ["GITHUB"],
) => summaryLine({ ...value, providers });

const metrics = (overrides: Partial<ActivityMetrics>): ActivityMetrics => ({
  activeDays: 8,
  pausedActiveDays: 0,
  commits: 23,
  prsOpened: 4,
  prsMerged: 3,
  codingSeconds: null,
  ...overrides,
});

describe("formatCodingTime", () => {
  it.each([
    [0, "0 phút code"],
    [30, "dưới 1 phút code"],
    [2_400, "40 phút code"],
    [3_599, "59 phút code"],
    [3_600, "1,0 giờ code"],
    [10_440, "2,9 giờ code"],
    // 2 giờ 59 phút: làm tròn xuống, không lên 3,0.
    [10_790, "2,9 giờ code"],
    [45_000, "12,5 giờ code"],
  ])("formats %i seconds as %s", (seconds, text) => {
    expect(formatCodingTime(seconds)).toBe(text);
  });
});

describe("summaryLine", () => {
  it("adds coding time after the GitHub metrics", () => {
    expect(
      summary(cycle({ metrics: metrics({ codingSeconds: 45_000 }) }), [
        "GITHUB",
        "WAKATIME",
      ]),
    ).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge · 12,5 giờ code",
    );
  });

  it("leaves out commits and pull requests without a repository", () => {
    expect(
      summary(
        cycle({
          metrics: metrics({
            commits: 0,
            prsOpened: 0,
            prsMerged: 0,
            codingSeconds: 45_000,
          }),
        }),
        ["WAKATIME"],
      ),
    ).toBe("8 ngày có hoạt động · 12,5 giờ code");
  });

  it("keeps counted commits even after the repository was unlinked", () => {
    expect(
      summary(cycle({ metrics: metrics({ codingSeconds: 600 }) }), [
        "WAKATIME",
      ]),
    ).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge · 10 phút code",
    );
  });

  it("shows zero coding time when measured, nothing when not", () => {
    expect(
      summary(cycle({ metrics: metrics({ codingSeconds: 0 }) }), [
        "GITHUB",
        "WAKATIME",
      ]),
    ).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge · 0 phút code",
    );
    expect(summary(cycle())).not.toContain("code");
  });

  it("counts coding below the active-day threshold as activity", () => {
    expect(
      summary(
        cycle({
          metrics: metrics({
            activeDays: 0,
            commits: 0,
            prsOpened: 0,
            prsMerged: 0,
            codingSeconds: 600,
          }),
        }),
        ["WAKATIME"],
      ),
    ).toBe("0 ngày có hoạt động · 10 phút code");
  });

  it("lists active days, commits and pull requests", () => {
    expect(summary(cycle())).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge",
    );
  });

  it("says how many of those days were while paused, and keeps zeros", () => {
    expect(
      summary(
        cycle({
          metrics: {
            activeDays: 8,
            pausedActiveDays: 2,
            commits: 1024,
            prsOpened: 0,
            prsMerged: 0,

            codingSeconds: null,
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

      codingSeconds: null,
    };
    expect(summary(cycle({ metrics: none }))).toBe(
      "Chưa có hoạt động trong vòng này.",
    );
    expect(
      summary(
        cycle({
          metrics: none,
          days: [
            { date: "2026-10-17", state: "NO_DATA", codingSeconds: null },
            { date: "2026-10-18", state: "NO_DATA", codingSeconds: null },
          ],
        }),
      ),
    ).toBe("Chưa có dữ liệu hoạt động cho vòng này.");
  });

  it("flags missing data reported by a stale source", () => {
    expect(summary(cycle({ hasMissingData: true }))).toBe(
      "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge (một số ngày chưa có dữ liệu)",
    );
  });

  it("flags days without data next to a normal line", () => {
    expect(
      summary(
        cycle({
          days: [
            { date: "2026-10-17", state: "NO_DATA", codingSeconds: null },
            { date: "2026-10-18", state: "ACTIVE", codingSeconds: null },
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
    expect(
      dayDescription({
        date: "2026-10-08",
        state: "PAUSED_ACTIVE",
        codingSeconds: null,
      }),
    ).toBe("08/10: có hoạt động lúc tạm dừng");
  });

  it("adds the coding time of a day that has some", () => {
    expect(
      dayDescription({
        date: "2026-10-20",
        state: "ACTIVE",
        codingSeconds: 10_440,
      }),
    ).toBe("20/10: có hoạt động · 2,9 giờ code");
    // Dưới ngưỡng 15 phút: chưa là ngày có hoạt động, nhưng vẫn nói giờ code.
    expect(
      dayDescription({ date: "2026-10-18", state: "IDLE", codingSeconds: 600 }),
    ).toBe("18/10: không có hoạt động · 10 phút code");
    expect(
      dayDescription({ date: "2026-10-19", state: "IDLE", codingSeconds: 0 }),
    ).toBe("19/10: không có hoạt động");
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

          codingSeconds: null,
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

          codingSeconds: null,
          lastActivityAt: "2026-10-14T03:00:00.000Z",
        },
        TZ,
      ),
    ).toBe("6 hoạt động kể từ khi dừng (gần nhất 14/10).");
  });

  it("adds coding time after closing, alone or after the events", () => {
    const afterClose = {
      kind: "ACTIVITY_AFTER_CLOSE" as const,
      lastActivityAt: "2026-10-14T03:00:00.000Z",
      codingSeconds: 9_000,
    };
    expect(
      divergenceText(
        { ...afterClose, closedAs: "COMPLETED", commits: 0, otherEvents: 0 },
        TZ,
      ),
    ).toBe("2,5 giờ code kể từ khi hoàn thành (gần nhất 14/10).");
    expect(
      divergenceText(
        { ...afterClose, closedAs: "STOPPED", commits: 4, otherEvents: 0 },
        TZ,
      ),
    ).toBe("4 commit · 2,5 giờ code kể từ khi dừng (gần nhất 14/10).");
    expect(
      divergenceText(
        {
          ...afterClose,
          closedAs: "STOPPED",
          commits: 4,
          otherEvents: 0,
          codingSeconds: 0,
        },
        TZ,
      ),
    ).toBe("4 commit kể từ khi dừng (gần nhất 14/10).");
  });
});
