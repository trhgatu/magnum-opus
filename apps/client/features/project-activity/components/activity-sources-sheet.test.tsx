// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActivitySourcesSheet } from "./activity-sources-sheet";

afterEach(cleanup);

describe("ActivitySourcesSheet", () => {
  it("keeps the sources out of the page until the button is pressed", () => {
    render(
      <ActivitySourcesSheet>
        <p>trhgatu/magnum-opus</p>
      </ActivitySourcesSheet>,
    );

    expect(screen.queryByText("trhgatu/magnum-opus")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Nguồn hoạt động" }));

    const sheet = screen.getByRole("dialog", { name: "Nguồn hoạt động" });
    expect(sheet.textContent).toContain("trhgatu/magnum-opus");
    expect(sheet.textContent).toContain(
      "Gắn repository GitHub hoặc project WakaTime",
    );
  });

  it("closes again", () => {
    render(
      <ActivitySourcesSheet>
        <p>trhgatu/magnum-opus</p>
      </ActivitySourcesSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nguồn hoạt động" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
