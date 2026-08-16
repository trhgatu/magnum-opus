import { describe, expect, it } from "vitest";

import {
  isNavigationItemActive,
  isProductSpaceActive,
} from "@/features/navigation/lib/navigation-state";

const journal = { href: "/journal" };
const reflection = {
  items: [{ href: "/journal" }, { href: "/memories" }],
};

describe("navigation state", () => {
  it("marks a capability root as active", () => {
    expect(isNavigationItemActive("/journal", journal)).toBe(true);
  });

  it("keeps a capability active on a detail route", () => {
    expect(isNavigationItemActive("/journal/entry-id", journal)).toBe(true);
  });

  it("does not match paths that only share a prefix", () => {
    expect(isNavigationItemActive("/journalism", journal)).toBe(false);
  });

  it("activates a space when one of its capabilities is active", () => {
    expect(isProductSpaceActive("/memories/memory-id", reflection)).toBe(true);
  });
});
