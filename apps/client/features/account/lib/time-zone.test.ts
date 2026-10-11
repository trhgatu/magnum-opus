import { describe, expect, it } from "vitest";

import {
  filterTimeZones,
  formatUtcOffset,
  sameTimeZone,
  timeZoneOptions,
} from "./time-zone";

describe("sameTimeZone", () => {
  it("treats an ICU legacy alias as the same zone", () => {
    // Browsers report Asia/Saigon while the account may store
    // Asia/Ho_Chi_Minh — the mismatch notice must not fire for that.
    expect(sameTimeZone("Asia/Ho_Chi_Minh", "Asia/Saigon")).toBe(true);
    expect(sameTimeZone("Asia/Kolkata", "Asia/Calcutta")).toBe(true);
  });

  it("tells different zones apart", () => {
    expect(sameTimeZone("UTC", "Asia/Ho_Chi_Minh")).toBe(false);
  });

  it("never matches an unknown zone", () => {
    expect(sameTimeZone("Mars/Base", "Mars/Base")).toBe(false);
  });
});

describe("timeZoneOptions", () => {
  it("lists UTC and the browser's known zones, sorted", () => {
    const options = timeZoneOptions("UTC");

    expect(options).toContain("UTC");
    expect(options).toContain("Europe/London");
    expect([...options].sort()).toEqual(options);
  });

  it("keeps the stored value even when the browser lists it under an alias", () => {
    const options = timeZoneOptions("Asia/Ho_Chi_Minh");

    expect(options).toContain("Asia/Ho_Chi_Minh");
    expect(options).not.toContain("Asia/Saigon");
  });

  it("does not duplicate a stored value the list already has", () => {
    const options = timeZoneOptions("Europe/London");

    expect(options.filter((zone) => zone === "Europe/London")).toHaveLength(1);
  });
});

describe("formatUtcOffset", () => {
  const january = new Date("2026-01-15T12:00:00Z");
  const july = new Date("2026-07-15T12:00:00Z");

  it("formats the offset for a given instant", () => {
    expect(formatUtcOffset("Asia/Ho_Chi_Minh", january)).toBe("GMT+07:00");
    expect(formatUtcOffset("UTC", january)).toBe("GMT+00:00");
  });

  it("follows daylight saving time", () => {
    expect(formatUtcOffset("Europe/London", january)).toBe("GMT+00:00");
    expect(formatUtcOffset("Europe/London", july)).toBe("GMT+01:00");
  });
});

describe("filterTimeZones", () => {
  const zones = [
    "America/New_York",
    "Asia/Saigon",
    "Asia/Calcutta",
    "Asia/Tokyo",
    "Europe/London",
    "UTC",
  ];
  const at = new Date("2026-01-15T12:00:00Z");

  it("returns every zone for an empty query", () => {
    expect(filterTimeZones(zones, "  ", at)).toEqual(zones);
  });

  it("matches names case-insensitively, with spaces for underscores", () => {
    expect(filterTimeZones(zones, "new york", at)).toEqual([
      "America/New_York",
    ]);
    expect(filterTimeZones(zones, "TOKYO", at)).toEqual(["Asia/Tokyo"]);
  });

  it("matches the UTC offset", () => {
    expect(filterTimeZones(zones, "+07", at)).toEqual(["Asia/Saigon"]);
    expect(filterTimeZones(zones, "gmt+09", at)).toEqual(["Asia/Tokyo"]);
  });

  it("matches the short offset the placeholder suggests", () => {
    expect(filterTimeZones(zones, "GMT+7", at)).toEqual(["Asia/Saigon"]);
    expect(filterTimeZones(zones, "gmt+5:30", at)).toEqual(["Asia/Calcutta"]);
  });

  it("finds renamed zones by their current name and country", () => {
    expect(filterTimeZones(zones, "ho chi minh", at)).toEqual(["Asia/Saigon"]);
    expect(filterTimeZones(zones, "Việt Nam", at)).toEqual(["Asia/Saigon"]);
    expect(filterTimeZones(zones, "kolkata", at)).toEqual(["Asia/Calcutta"]);
  });
});
