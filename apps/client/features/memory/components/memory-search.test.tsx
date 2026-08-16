// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MemorySearch } from "./memory-search";

afterEach(cleanup);

describe("MemorySearch", () => {
  it("renders a progressive GET search form", () => {
    const { container } = render(
      <MemorySearch search="" sortBy="occurredOn" sortOrder="desc" />,
    );

    const form = screen.getByRole("search");

    expect(form.getAttribute("action")).toBe("/memories");
    expect(form.getAttribute("method")).toBeNull();

    expect(
      screen.getByRole("searchbox", {
        name: "Tìm trong ký ức",
      }),
    ).toBeTruthy();

    expect(screen.getByRole("button", { name: "Tìm" })).toBeTruthy();

    expect(container.querySelector('input[name="state"]')).toBeNull();

    expect(container.querySelector('input[name="sortBy"]')).toBeNull();

    expect(container.querySelector('input[name="sortOrder"]')).toBeNull();
  });

  it("preserves non-default filters and sorting", () => {
    const { container } = render(
      <MemorySearch
        search="summer light"
        state="TRASHED"
        sortBy="updatedAt"
        sortOrder="asc"
      />,
    );

    expect(
      screen
        .getByRole("searchbox", {
          name: "Tìm trong ký ức",
        })
        .getAttribute("value"),
    ).toBe("summer light");

    expect(
      container.querySelector<HTMLInputElement>('input[name="state"]')?.value,
    ).toBe("TRASHED");

    expect(
      container.querySelector<HTMLInputElement>('input[name="sortBy"]')?.value,
    ).toBe("updatedAt");

    expect(
      container.querySelector<HTMLInputElement>('input[name="sortOrder"]')
        ?.value,
    ).toBe("asc");

    expect(
      screen
        .getByRole("link", {
          name: "Xóa từ khóa tìm kiếm",
        })
        .getAttribute("href"),
    ).toBe("/memories?state=TRASHED&sortBy=updatedAt&sortOrder=asc");
  });
});
