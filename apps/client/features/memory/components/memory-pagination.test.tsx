// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MemoryPagination } from "./memory-pagination";

afterEach(cleanup);

describe("MemoryPagination", () => {
  it("does not render for a single-page collection", () => {
    const { container } = render(
      <MemoryPagination
        page={1}
        totalPages={1}
        search=""
        sortBy="occurredOn"
        sortOrder="desc"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("preserves collection state between pages", () => {
    render(
      <MemoryPagination
        page={3}
        totalPages={5}
        search="old garden"
        state="TRASHED"
        sortBy="updatedAt"
        sortOrder="asc"
      />,
    );

    expect(screen.getByText("Trang 3 / 5")).toBeTruthy();

    const previousLink = screen.getByRole("link", {
      name: "Trang trước",
    });

    const nextLink = screen.getByRole("link", {
      name: "Trang sau",
    });

    expect(previousLink.getAttribute("href")).toBe(
      "/memories?page=2&search=old+garden" +
        "&state=TRASHED&sortBy=updatedAt&sortOrder=asc",
    );

    expect(previousLink.getAttribute("rel")).toBe("prev");

    expect(nextLink.getAttribute("href")).toBe(
      "/memories?page=4&search=old+garden" +
        "&state=TRASHED&sortBy=updatedAt&sortOrder=asc",
    );

    expect(nextLink.getAttribute("rel")).toBe("next");
  });

  it("renders only navigation that exists at collection boundaries", () => {
    const { rerender } = render(
      <MemoryPagination
        page={1}
        totalPages={3}
        search=""
        sortBy="occurredOn"
        sortOrder="desc"
      />,
    );

    expect(screen.queryByRole("link", { name: "Trang trước" })).toBeNull();

    expect(screen.getByRole("link", { name: "Trang sau" })).toBeTruthy();

    rerender(
      <MemoryPagination
        page={3}
        totalPages={3}
        search=""
        sortBy="occurredOn"
        sortOrder="desc"
      />,
    );

    expect(screen.getByRole("link", { name: "Trang trước" })).toBeTruthy();

    expect(screen.queryByRole("link", { name: "Trang sau" })).toBeNull();
  });
});
