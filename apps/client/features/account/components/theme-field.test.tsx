// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeField } from "./theme-field";

const systemDark = (matches: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches })),
  );

describe("ThemeField", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    systemDark(false);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("marks the saved choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeField />);

    expect(screen.getByRole("radio", { name: "Tối" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sáng" })).not.toBeChecked();
  });

  it("follows the system before a choice is stored", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "nope");
    render(<ThemeField />);

    expect(screen.getByRole("radio", { name: "Theo hệ thống" })).toBeChecked();
  });

  it("saves the choice and switches the page right away", () => {
    render(<ThemeField />);

    fireEvent.click(screen.getByRole("radio", { name: "Tối" }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("radio", { name: "Tối" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Sáng" }));

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("uses the system setting when set to follow it", () => {
    systemDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeField />);

    fireEvent.click(screen.getByRole("radio", { name: "Theo hệ thống" }));

    expect(document.documentElement).toHaveClass("dark");
  });
});

describe("ThemeField across tabs", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("shows a choice made in another tab", async () => {
    render(<ThemeField />);

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
      );
    });

    expect(screen.getByRole("radio", { name: "Tối" })).toBeChecked();
  });
});
