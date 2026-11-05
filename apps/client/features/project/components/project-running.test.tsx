// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ProjectResponse } from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectRow } from "./project-row";
import { ProjectRunning } from "./project-running";

vi.mock("@/features/project-activity/api/project-activity", () => ({
  // Hoạt động chưa về: thẻ hiện khung chờ, phần còn lại vẫn dựng.
  getProjectActivity: vi.fn(() => new Promise(() => {})),
}));

afterEach(cleanup);

const TZ = "Asia/Ho_Chi_Minh";
const TODAY = "2026-11-05";

const project = (
  id: string,
  overrides: Partial<ProjectResponse> = {},
): ProjectResponse => ({
  id,
  title: `Project ${id}`,
  description: null,
  lifecycleState: "ACTIVE",
  currentCycle: {
    id: `${id}-c`,
    cycleNumber: 2,
    intendedOutcome: "Giao diện có hồn",
    outcomeHistory: [],
    targetEndAt: null,
    closingNote: null,
    startedAt: "2026-11-01T02:00:00.000Z",
    endedAt: null,
    endReason: null,
  },
  revision: 1,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("ProjectRunning", () => {
  it("shows one running Project as a full card with its cycle day", () => {
    render(
      <ProjectRunning projects={[project("a")]} today={TODAY} timeZone={TZ} />,
    );

    expect(
      screen.getByRole("heading", { name: "Đang luyện · 1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Project a" })).toHaveAttribute(
      "href",
      "/projects/a",
    );
    expect(screen.getByText("Cycle 2 · ngày 5")).toBeInTheDocument();
    expect(screen.getByText("Giao diện có hồn")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đang tải hoạt động của Cycle…",
    );
  });

  it("lays several running Projects out as compact cards", () => {
    render(
      <ProjectRunning
        projects={[project("a"), project("b"), project("c")]}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Đang luyện · 3" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    // Mỗi thẻ tải hoạt động riêng.
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("renders nothing without a running Cycle", () => {
    const { container } = render(
      <ProjectRunning
        projects={[project("a", { currentCycle: null })]}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ProjectRow", () => {
  it("links to the Project with its state and cycle", () => {
    render(
      <ul>
        <ProjectRow project={project("a", { lifecycleState: "PAUSED" })} />
      </ul>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/a");
    expect(link).toHaveTextContent("Project a");
    expect(link).toHaveTextContent("Tạm dừng");
    expect(link).toHaveTextContent("Cycle 2 · Giao diện có hồn");
  });

  it("falls back to the description without a cycle", () => {
    render(
      <ul>
        <ProjectRow
          project={project("a", {
            lifecycleState: "NOT_STARTED",
            currentCycle: null,
            description: "Chưa bắt đầu luyện",
          })}
        />
      </ul>,
    );

    expect(screen.getByRole("link")).toHaveTextContent("Chưa bắt đầu luyện");
  });
});
