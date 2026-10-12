// @vitest-environment jsdom

import type { ProjectCycleResponse } from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectClosedCycles } from "./project-closed-cycles";

afterEach(cleanup);

const completed: ProjectCycleResponse = {
  id: "cycle-2",
  cycleNumber: 2,
  intendedOutcome: "Đàn Für Elise rút gọn",
  outcomeHistory: [
    { outcome: "Đàn Canon in D", setAt: "2026-09-02T02:00:00.000Z" },
    { outcome: "Đàn Für Elise rút gọn", setAt: "2026-09-10T02:00:00.000Z" },
  ],
  targetEndAt: "2026-09-30",
  closingNote: "Xong sớm hơn dự kiến",
  startedAt: "2026-09-01T02:00:00.000Z",
  endedAt: "2026-09-25T02:00:00.000Z",
  endReason: "COMPLETED",
};

const stopped: ProjectCycleResponse = {
  id: "cycle-1",
  cycleNumber: 1,
  intendedOutcome: null,
  outcomeHistory: [],
  targetEndAt: null,
  closingNote: null,
  startedAt: "2026-08-01T02:00:00.000Z",
  endedAt: "2026-08-15T02:00:00.000Z",
  endReason: "STOPPED",
};

describe("ProjectClosedCycles", () => {
  it("renders nothing before any Cycle has closed", () => {
    const { container } = render(
      <ProjectClosedCycles cycles={[]} timeZone="UTC" />,
    );

    expect(container.textContent).toBe("");
  });

  it("says the history could not be loaded instead of hiding it", () => {
    render(<ProjectClosedCycles cycles={null} timeZone="UTC" />);

    expect(screen.getByRole("status").textContent).toBe(
      "Chưa tải được các chu kỳ đã đóng. Tải lại trang để thử lại.",
    );
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("shows each closed Cycle in the order given, newest first", () => {
    render(
      <ProjectClosedCycles cycles={[completed, stopped]} timeZone="UTC" />,
    );

    const section = screen.getByRole("region", { name: "Các chu kỳ đã đóng" });
    const headings = within(section)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Cycle 2", "Cycle 1"]);
  });

  it("shows how a completed Cycle ended, with its outcome, target date and note", () => {
    render(<ProjectClosedCycles cycles={[completed]} timeZone="UTC" />);

    const cycle = screen.getByRole("article", { name: "Cycle 2" });

    expect(within(cycle).getByText("Hoàn thành")).toBeTruthy();
    expect(
      within(cycle).getAllByText("Đàn Für Elise rút gọn"),
    ).not.toHaveLength(0);
    expect(within(cycle).getByText("Xong sớm hơn dự kiến")).toBeTruthy();
    expect(within(cycle).getByText("30/09/2026").getAttribute("dateTime")).toBe(
      "2026-09-30",
    );
    expect(within(cycle).getByText("01/09/2026")).toBeTruthy();
    expect(within(cycle).getByText("25/09/2026")).toBeTruthy();
    expect(within(cycle).getByText("Lịch sử outcome (2 lần đặt)")).toBeTruthy();
  });

  it("shows a stopped Cycle without an outcome, a target date or a note", () => {
    render(<ProjectClosedCycles cycles={[stopped]} timeZone="UTC" />);

    const cycle = screen.getByRole("article", { name: "Cycle 1" });

    expect(within(cycle).getByText("Đã dừng")).toBeTruthy();
    expect(within(cycle).getByText("Chưa xác định outcome")).toBeTruthy();
    expect(within(cycle).queryByText(/Dự kiến kết thúc/)).toBeNull();
    expect(within(cycle).queryByText("Ghi chú khép lại")).toBeNull();
    expect(within(cycle).queryByText(/Lịch sử outcome/)).toBeNull();
  });

  it("dates the Cycle in the account time zone", () => {
    render(
      <ProjectClosedCycles
        cycles={[
          {
            ...stopped,
            startedAt: "2026-08-01T18:30:00.000Z",
            endedAt: "2026-08-15T18:30:00.000Z",
          },
        ]}
        timeZone="Asia/Ho_Chi_Minh"
      />,
    );

    expect(screen.getByText("02/08/2026")).toBeTruthy();
    expect(screen.getByText("16/08/2026")).toBeTruthy();
  });
});
