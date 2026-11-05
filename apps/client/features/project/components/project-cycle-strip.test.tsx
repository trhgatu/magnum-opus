// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ProjectCycleResponse } from "@repo/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectCycleStrip } from "./project-cycle-strip";

afterEach(cleanup);

const TZ = "Asia/Ho_Chi_Minh";
const TODAY = "2026-11-02";

const cycle = (
  cycleNumber: number,
  overrides: Partial<ProjectCycleResponse> = {},
): ProjectCycleResponse => ({
  id: `c${cycleNumber}`,
  cycleNumber,
  intendedOutcome: null,
  outcomeHistory: [],
  targetEndAt: null,
  closingNote: null,
  startedAt: "2026-10-01T02:00:00.000Z",
  endedAt: null,
  endReason: null,
  ...overrides,
});

// API trả các vòng đã khép mới nhất trước.
const closed = [
  cycle(2, {
    startedAt: "2026-10-13T02:00:00.000Z",
    endedAt: "2026-10-20T10:00:00.000Z",
    endReason: "STOPPED",
  }),
  cycle(1, {
    startedAt: "2026-10-01T02:00:00.000Z",
    endedAt: "2026-10-12T10:00:00.000Z",
    endReason: "COMPLETED",
  }),
];

const items = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("ProjectCycleStrip", () => {
  it("lays every cycle out oldest first with the open one last", () => {
    render(
      <ProjectCycleStrip
        closedCycles={closed}
        currentCycle={cycle(3, {
          startedAt: "2026-10-29T02:00:00.000Z",
          targetEndAt: "2026-11-30",
        })}
        paused={false}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Các vòng luyện" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3 vòng · từ 1 tháng 10, 2026"),
    ).toBeInTheDocument();
    expect(items()).toEqual([
      "Cycle 101/10 – 12/10 · Hoàn thành",
      "Cycle 213/10 – 20/10 · Dừng",
      "Cycle 329/10 → dự kiến 30/11 · đang chạy · ngày 5",
    ]);
  });

  it("sizes each cycle by its days", () => {
    render(
      <ProjectCycleStrip
        closedCycles={closed}
        currentCycle={null}
        paused={false}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    const grow = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((item) => item.style.flexGrow);
    expect(grow).toEqual(["12", "8"]);
  });

  it("marks a paused open cycle", () => {
    render(
      <ProjectCycleStrip
        closedCycles={[]}
        currentCycle={cycle(1, { startedAt: "2026-11-01T02:00:00.000Z" })}
        paused
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(items()).toEqual(["Cycle 1từ 01/11 · tạm dừng · ngày 2"]);
  });

  it("renders nothing for a Project that never started", () => {
    const { container } = render(
      <ProjectCycleStrip
        closedCycles={[]}
        currentCycle={null}
        paused={false}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
