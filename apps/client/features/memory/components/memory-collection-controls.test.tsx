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

    const stateNavigation = screen.getByRole("navigation", {
      name: "Lọc ký ức theo trạng thái",
    });

    const activeLink = within(stateNavigation).getByRole("link", {
      name: "Đang lưu giữ",
    });

    expect(activeLink.getAttribute("aria-current")).toBe("page");
    expect(activeLink.getAttribute("href")).toBe("/memories?search=summer");

    expect(
      within(stateNavigation)
        .getByRole("link", { name: "Trash" })
        .getAttribute("href"),
    ).toBe("/memories?search=summer&state=TRASHED");

    const sortNavigation = screen.getByRole("navigation", {
      name: "Sắp xếp",
    });

    expect(
      within(sortNavigation)
        .getByRole("link", { name: "Lần chỉnh sửa" })
        .getAttribute("href"),
    ).toBe("/memories?search=summer&sortBy=updatedAt");

    const orderNavigation = screen.getByRole("navigation", {
      name: "Thứ tự",
    });

    expect(
      within(orderNavigation)
        .getByRole("link", { name: "Cũ trước" })
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

    const trashLink = screen.getByRole("link", {
      name: "Trash",
    });

    const updatedAtLink = screen.getByRole("link", {
      name: "Lần chỉnh sửa",
    });

    const ascendingLink = screen.getByRole("link", {
      name: "Cũ trước",
    });

    expect(trashLink.getAttribute("aria-current")).toBe("page");
    expect(updatedAtLink.getAttribute("aria-current")).toBe("page");
    expect(ascendingLink.getAttribute("aria-current")).toBe("page");

    expect(
      screen
        .getByRole("link", { name: "Thời điểm xảy ra" })
        .getAttribute("href"),
    ).toBe("/memories?state=TRASHED&sortOrder=asc");
  });
});
