// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme";

/** MediaQueryList giả, đổi được `matches` và phát sự kiện change. */
function stubSystemTheme(initiallyDark: boolean) {
  const listeners: Array<() => void> = [];
  const query = {
    matches: initiallyDark,
    addEventListener: (_: string, listener: () => void) =>
      listeners.push(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query),
  );
  return (dark: boolean) => {
    query.matches = dark;
    listeners.forEach((listener) => listener());
  };
}

const boot = () => new Function(THEME_BOOT_SCRIPT)();
const root = () => document.documentElement.classList;

describe("theme boot script", () => {
  beforeEach(() => {
    localStorage.clear();
    root().remove("dark");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows the system, including later switches, by default", () => {
    const setSystemDark = stubSystemTheme(false);
    boot();
    expect(root().contains("dark")).toBe(false);

    setSystemDark(true);
    expect(root().contains("dark")).toBe(true);
  });

  it("keeps an explicit choice when the system switches", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    const setSystemDark = stubSystemTheme(false);
    boot();

    setSystemDark(true);
    expect(root().contains("dark")).toBe(false);
  });

  it("applies a choice made in another tab", () => {
    stubSystemTheme(false);
    boot();

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.dispatchEvent(
      new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
    );

    expect(root().contains("dark")).toBe(true);
  });
});
