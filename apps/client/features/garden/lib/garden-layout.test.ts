import type {
  GardenLanternResponse,
  GardenTreeResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  BED_SPACING,
  gardenLayout,
  gardenPath,
  HIT_RADIUS,
} from "./garden-layout";

const tree = (
  id: string,
  plantedOn: string,
  bed: GardenTreeResponse["bed"] = null,
): GardenTreeResponse => ({
  id,
  subjectKind: "HABIT",
  subjectId: `habit-${id}`,
  variant: "BUILD",
  name: id,
  nameAtPlanting: id,
  bed,
  simVersion: 1,
  plantedOn,
  weeks: [],
  weeds: 0,
});

const morning = { id: "r1", name: "Morning" };

describe("gardenLayout", () => {
  it("groups trees of one Routine into a single bed", () => {
    const slots = gardenLayout([
      tree("a", "2026-09-01", morning),
      tree("b", "2026-09-05"),
      tree("c", "2026-10-01", morning),
    ]);

    expect(slots).toHaveLength(2);
    expect(slots[0]!.bed).toEqual(morning);
    expect(slots[0]!.trees.map((entry) => entry.tree.id)).toEqual(["a", "c"]);
    expect(slots[1]!.bed).toBeNull();
  });

  it("orders slots along the path by their earliest planting day", () => {
    const slots = gardenLayout([
      tree("late", "2026-11-01"),
      tree("early", "2026-08-01", morning),
    ]);

    expect(slots.map((slot) => slot.t)).toEqual([0, 1]);
    expect(slots[0]!.bed).toEqual(morning);
    expect(slots.map((slot) => slot.side)).toEqual([-1, 1]);
  });

  it("keeps trees in a bed farther apart than their tap areas", () => {
    expect(BED_SPACING).toBeGreaterThan(HIT_RADIUS * 2);
  });

  it("puts a single slot in the middle of the path", () => {
    expect(gardenLayout([tree("only", "2026-11-01")])[0]!.t).toBe(0.5);
  });

  it("spreads a bed into a centred grid that never stacks two trees", () => {
    const members = ["a", "b", "c", "d", "e"].map((id) =>
      tree(id, "2026-09-01", morning),
    );
    const [slot] = gardenLayout(members);
    const offsets = slot!.trees.map(({ dx, dz }) => `${dx},${dz}`);

    expect(new Set(offsets).size).toBe(members.length);
    expect(slot!.trees[0]).toMatchObject({
      dx: -BED_SPACING,
      dz: -BED_SPACING / 2,
    });
  });
});

const lantern = (
  id: string,
  placedOn: string | null,
): GardenLanternResponse => ({
  id,
  memoryId: `memory-${id}`,
  occurredOn: placedOn,
  precision: placedOn ? "DAY" : "UNKNOWN",
  placedOn,
});

describe("gardenPath", () => {
  it("puts lanterns among trees in date order, undated ones first", () => {
    const path = gardenPath(
      [tree("a", "2026-09-01")],
      [
        lantern("old", "2018-08-15"),
        lantern("later", "2026-10-01"),
        lantern("x", null),
        lantern("y", null),
      ],
    );

    expect(path.lanterns.map((spot) => spot.t)).toEqual([0, 1 / 3, 1]);
    expect(path.lanterns[0]!.lanterns.map((l) => l.lantern.id)).toEqual([
      "x",
      "y",
    ]);
    expect(path.slots.map((slot) => slot.t)).toEqual([2 / 3]);
  });

  it("puts a lantern before a tree planted on the same day", () => {
    const path = gardenPath(
      [tree("a", "2026-09-01")],
      [lantern("l", "2026-09-01")],
    );

    expect(path.lanterns[0]!.t).toBe(0);
    expect(path.slots[0]!.t).toBe(1);
  });

  it("never stacks two lanterns of the undated cluster", () => {
    const [spot] = gardenPath(
      [],
      ["a", "b", "c"].map((id) => lantern(id, null)),
    ).lanterns;

    const offsets = spot!.lanterns.map(({ dx, dz }) => `${dx},${dz}`);
    expect(new Set(offsets).size).toBe(3);
  });
});
