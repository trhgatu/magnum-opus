import type { GardenTreeResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import { gardenStory } from "./garden-story";

type Week = GardenTreeResponse["weeks"][number];

const week = (status: Week["status"], scarred = false): Week => ({
  start: "2026-11-02",
  status,
  scarred,
});

const tree = (
  overrides: Partial<GardenTreeResponse> = {},
): GardenTreeResponse => ({
  id: "subject-id",
  subjectKind: "HABIT",
  subjectId: "habit-id",
  variant: "BUILD",
  name: "Đọc sách",
  simVersion: 1,
  plantedOn: "2026-09-07",
  weeks: [week("CARED"), week("CARED")],
  weeds: 0,
  ...overrides,
});

describe("gardenStory", () => {
  it("tells when a tree was planted and that it is cared for", () => {
    expect(gardenStory(tree())).toBe(
      "Cây Đọc sách, gieo tháng 9/2026. Được chăm đều từ ngày gieo.",
    );
  });

  it("waits on a tree planted this week", () => {
    expect(gardenStory(tree({ weeks: [week("PENDING")] }))).toContain(
      "chờ tuần đầu tiên",
    );
  });

  it("speaks of a knot after a break, not of the break itself", () => {
    const story = gardenStory(
      tree({ weeks: [week("CARED"), week("RESTED"), week("CARED")] }),
    );

    expect(story).toContain("mắt gỗ");
    expect(story).not.toContain("chăm đều");
  });

  it("names weeds without counting them", () => {
    const story = gardenStory(
      tree({
        weeks: [week("CARED"), week("RESTED"), week("RESTED"), week("RESTED")],
        weeds: 1,
      }),
    );

    expect(story).toContain("Cỏ đang mọc");
    expect(story).not.toMatch(/\d+ (tuần|bậc|lần)/);
  });

  it("calls a scar healed on a thorn bush", () => {
    const story = gardenStory(
      tree({ variant: "QUIT", weeks: [week("CARED", true), week("CARED")] }),
    );

    expect(story).toMatch(/^Bụi gai Đọc sách/);
    expect(story).toContain("sẹo đã liền");
  });

  it("says a neglected tree is waiting before any weeds grow", () => {
    expect(
      gardenStory(tree({ weeks: [week("CARED"), week("RESTED")] })),
    ).toContain("đứng yên chờ");
  });

  it("calls an archived tree dormant", () => {
    expect(
      gardenStory(tree({ weeks: [week("CARED"), week("SKIPPED")] })),
    ).toContain("ngủ đông");
  });
});
