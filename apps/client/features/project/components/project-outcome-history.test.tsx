// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectOutcomeHistory } from "./project-outcome-history";

afterEach(cleanup);

const history = [
  { outcome: "Đàn Canon in D", setAt: "2026-09-01T02:00:00.000Z" },
  { outcome: "Đàn Für Elise rút gọn", setAt: "2026-09-20T02:00:00.000Z" },
  // 18:30 UTC ngày 11 = ngày 12 ở Việt Nam.
  { outcome: "Đàn Für Elise đầy đủ", setAt: "2026-10-11T18:30:00.000Z" },
];

describe("ProjectOutcomeHistory", () => {
  it("renders nothing while the outcome has never been changed", () => {
    const { container: empty } = render(
      <ProjectOutcomeHistory history={[]} timeZone="UTC" />,
    );
    expect(empty.textContent).toBe("");
    cleanup();

    const { container: single } = render(
      <ProjectOutcomeHistory history={history.slice(0, 1)} timeZone="UTC" />,
    );
    expect(single.textContent).toBe("");
  });

  it("lists every outcome, newest first, with the current one marked", () => {
    const { container } = render(
      <ProjectOutcomeHistory history={history} timeZone="UTC" />,
    );

    expect(screen.getByText("Lịch sử outcome (3 lần đặt)")).toBeTruthy();

    const items = [...container.querySelectorAll("li")];
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Đàn Für Elise đầy đủ"),
      expect.stringContaining("Đàn Für Elise rút gọn"),
      expect.stringContaining("Đàn Canon in D"),
    ]);
    expect(items[0].textContent).toContain("Mới nhất");
    expect(items[1].textContent).not.toContain("Mới nhất");
  });

  it("dates each entry in the account time zone, keeping the exact instant", () => {
    const { container } = render(
      <ProjectOutcomeHistory history={history} timeZone="Asia/Ho_Chi_Minh" />,
    );

    const newest = container.querySelector("li time");
    expect(newest?.getAttribute("dateTime")).toBe("2026-10-11T18:30:00.000Z");
    expect(newest?.textContent).toBe("12/10/2026");
  });
});
