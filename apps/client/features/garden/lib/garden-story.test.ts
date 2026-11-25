import type {
  GardenLanternResponse,
  GardenTreeResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import { gardenStory, lanternDate, lanternStory } from "./garden-story";

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
  nameAtPlanting: "Đọc sách",
  bed: null,
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

  it("keeps the name the tree was planted with in its story", () => {
    expect(gardenStory(tree({ nameAtPlanting: "Đọc truyện" }))).toBe(
      "Cây Đọc sách, gieo tháng 9/2026. Lúc gieo, nó mang tên Đọc truyện. Được chăm đều từ ngày gieo.",
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

describe("lanternStory", () => {
  const lantern = (
    occurredOn: string | null,
    precision: GardenLanternResponse["precision"],
  ): GardenLanternResponse => ({
    id: "l",
    memoryId: "m",
    occurredOn,
    precision,
    placedOn: occurredOn,
  });

  it("dates a memory only as precisely as it was written", () => {
    expect(lanternDate(lantern("2018-08-11", "DAY"))).toBe("11/8/2018");
    expect(lanternDate(lantern("2018-08-01", "MONTH"))).toBe("Tháng 8/2018");
    expect(lanternDate(lantern("2018-01-01", "YEAR"))).toBe("Năm 2018");
  });

  it("tells an undated memory where it waits", () => {
    expect(lanternStory(lantern(null, "UNKNOWN"))).toContain("chưa rõ ngày");
    expect(lanternStory(lantern("2018-08-01", "MONTH"))).toContain(
      "tháng 8/2018",
    );
  });
});
