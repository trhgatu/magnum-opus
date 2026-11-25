// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MemoryCollectionControls } from "./memory-collection-controls";

afterEach(cleanup);

describe("MemoryCollectionControls", () => {
  it("renders canonical links from the default collection", () => {
    render(
      <MemoryCollectionControls
        search="summer"
        sortBy="occurredOn"
        sortOrder="desc"
      />,
    );

    expect(
      screen.getByText(/Sắp theo thời điểm xảy ra · mới trước/),
    ).toBeTruthy();

    const sortNavigation = screen.getByRole("navigation", {
      name: "Sắp xếp theo",
      hidden: true,
    });

    expect(
      within(sortNavigation)
        .getByRole("link", { name: "Lần chỉnh sửa", hidden: true })
        .getAttribute("href"),
    ).toBe("/memories?search=summer&sortBy=updatedAt");

    const orderNavigation = screen.getByRole("navigation", {
      name: "Thứ tự",
      hidden: true,
    });

    expect(
      within(orderNavigation)
        .getByRole("link", { name: "Cũ trước", hidden: true })
        .getAttribute("href"),
    ).toBe("/memories?search=summer&sortOrder=asc");
  });

  it("marks non-default controls as current", () => {
    render(
      <MemoryCollectionControls
        search=""
        state="TRASHED"
        sortBy="updatedAt"
        sortOrder="asc"
      />,
    );

    const updatedAtLink = screen.getByRole("link", {
      name: "Lần chỉnh sửa",
      hidden: true,
    });

    const ascendingLink = screen.getByRole("link", {
      name: "Cũ trước",
      hidden: true,
    });

    expect(updatedAtLink.getAttribute("aria-current")).toBe("page");
    expect(ascendingLink.getAttribute("aria-current")).toBe("page");

    expect(
      screen
        .getByRole("link", { name: "Thời điểm xảy ra", hidden: true })
        .getAttribute("href"),
    ).toBe("/memories?state=TRASHED&sortOrder=asc");
  });

  it("uses an auto popover so the browser dismisses outside interaction", () => {
    const { container } = render(
      <MemoryCollectionControls
        search=""
        sortBy="occurredOn"
        sortOrder="desc"
      />,
    );

    const trigger = container.querySelector<HTMLButtonElement>(
      '[popovertarget="memory-sort-popover"]',
    );
    const popover = container.querySelector<HTMLDivElement>(
      "#memory-sort-popover",
    );

    expect(trigger?.getAttribute("popovertarget")).toBe("memory-sort-popover");
    expect(popover?.getAttribute("popover")).toBe("auto");
  });
});
