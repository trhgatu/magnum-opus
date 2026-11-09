// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type {
  JournalEntryResponse,
  MemoryResponse,
  ProjectResponse,
} from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Activity, TodayCrucible } from "./today-crucible";
import { TodayReflection } from "./today-reflection";

vi.mock("@/features/journal/actions/journal", () => ({
  createJournalEntry: vi.fn(),
}));

afterEach(cleanup);

const TZ = "Asia/Ho_Chi_Minh";
const TODAY = "2026-11-04";

describe("TodayCrucible", () => {
  const project: ProjectResponse = {
    id: "p1",
    title: "Magnum Opus",
    description: null,
    lifecycleState: "ACTIVE",
    currentCycle: {
      id: "c4",
      cycleNumber: 4,
      intendedOutcome: "Giao diện có hồn, không khô như một trang quản lý.",
      outcomeHistory: [],
      targetEndAt: null,
      closingNote: null,
      startedAt: "2026-10-31T02:00:00.000Z",
      endedAt: null,
      endReason: null,
    },
    revision: 1,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-03T00:00:00.000Z",
  };

  it("shows the project, its cycle day and the intended outcome", () => {
    render(
      <TodayCrucible
        project={project}
        activityPromise={null}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(screen.getByRole("link", { name: "Magnum Opus" })).toHaveAttribute(
      "href",
      "/projects/p1",
    );
    expect(screen.getByText("Cycle 4 · ngày 5")).toBeInTheDocument();
    expect(
      screen.getByText("Giao diện có hồn, không khô như một trang quản lý."),
    ).toBeInTheDocument();
  });

  it("points to the projects when none is running", () => {
    render(
      <TodayCrucible
        project={null}
        activityPromise={null}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Chưa có Project nào đang luyện." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Xem các Project" }),
    ).toHaveAttribute("href", "/projects");
  });
});

describe("TodayReflection", () => {
  const memory: MemoryResponse = {
    id: "m1",
    sourceJournalEntryId: null,
    title: "Buổi chiều bên cửa sổ",
    content: "",
    occurredOn: null,
    occurredOnPrecision: "UNKNOWN",
    state: "ACTIVE",
    revision: 1,
    trashedAt: null,
    createdAt: "2026-11-01T03:00:00.000Z",
    updatedAt: "2026-11-01T03:00:00.000Z",
  };

  it("invites a page when nothing is written today", () => {
    render(
      <TodayReflection
        entryToday={null}
        latestMemory={memory}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Điều gì đáng nhớ từ hôm qua?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Viết trang hôm nay" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Ký ức gần nhất: Buổi chiều bên cửa sổ · 3 ngày trước",
      }),
    ).toHaveAttribute("href", "/memories/m1");
  });

  it("opens today's page once it exists", () => {
    const entry: JournalEntryResponse = {
      id: "e1",
      title: "Một ngày dài",
      content: "Đã xong phần giao diện.",
      state: "DRAFT",
      stateBeforeTrash: null,
      revision: 2,
      trashedAt: null,
      createdAt: "2026-11-04T01:00:00.000Z",
      updatedAt: "2026-11-04T02:00:00.000Z",
    };
    render(
      <TodayReflection
        entryToday={entry}
        latestMemory={null}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Một ngày dài" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mở trang hôm nay" }),
    ).toHaveAttribute("href", "/journal/e1");
    expect(screen.getByText("Chưa có ký ức nào.")).toBeInTheDocument();
  });
});

describe("Crucible activity", () => {
  const activity = (codingSeconds: number | null) =>
    Promise.resolve({
      projectId: "p1",
      timeZone: TZ,
      sources: [],
      divergences: [],
      currentCycle: {
        cycleId: "c4",
        cycleNumber: 4,
        startedAt: "2026-10-31T02:00:00.000Z",
        metrics: {
          activeDays: 3,
          pausedActiveDays: 1,
          commits: 17,
          prsOpened: 0,
          prsMerged: 0,
          codingSeconds,
        },
        lastActivityAt: null,
        days: [
          {
            date: "2026-11-02",
            state: "ACTIVE" as const,
            codingSeconds: 3600,
            commits: null,
          },
          {
            date: "2026-11-03",
            state: "PAUSED_ACTIVE" as const,
            codingSeconds: 0,
            commits: null,
          },
          {
            date: TODAY,
            state: "IDLE" as const,
            codingSeconds: 0,
            commits: null,
          },
        ],
        hasMissingData: false,
        dataUntil: null,
      },
    });

  it("lists the week day by day and shows the cycle numbers", async () => {
    render(await Activity({ activityPromise: activity(23_040), today: TODAY }));

    const week = screen.getByRole("list", { name: "7 ngày qua" });
    expect(week.children).toHaveLength(7);
    expect(week).toHaveTextContent("T2: có hoạt động");
    expect(week).toHaveTextContent("T3: có hoạt động lúc tạm dừng");
    expect(week).toHaveTextContent("T4: không có hoạt động");
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("6,4")).toBeInTheDocument();
  });

  it("hides coding hours when WakaTime has no data", async () => {
    render(await Activity({ activityPromise: activity(null), today: TODAY }));

    expect(screen.queryByText("giờ code")).toBeNull();
  });

  it("shows nothing when the activity cannot be read", async () => {
    const ui = await Activity({
      activityPromise: Promise.reject(new Error("GitHub down")),
      today: TODAY,
    });

    expect(ui).toBeNull();
  });
});

describe("TodayReflection fallbacks", () => {
  const entry: JournalEntryResponse = {
    id: "e1",
    title: null,
    content: "",
    state: "DRAFT",
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt: "2026-11-04T01:00:00.000Z",
    updatedAt: "2026-11-04T01:00:00.000Z",
  };
  const memory = (createdAt: string): MemoryResponse => ({
    id: "m1",
    sourceJournalEntryId: null,
    title: "Mưa đầu mùa",
    content: "",
    occurredOn: null,
    occurredOnPrecision: "UNKNOWN",
    state: "ACTIVE",
    revision: 1,
    trashedAt: null,
    createdAt,
    updatedAt: createdAt,
  });

  it("names an untitled, empty page for today", () => {
    render(
      <TodayReflection
        entryToday={entry}
        latestMemory={memory("2026-11-04T02:00:00.000Z")}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Hôm nay đã có một trang." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Trang còn trống, đang chờ vài dòng."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Ký ức gần nhất: Mưa đầu mùa · hôm nay",
      }),
    ).toBeInTheDocument();
  });

  it("says yesterday for a memory from yesterday", () => {
    render(
      <TodayReflection
        entryToday={null}
        latestMemory={memory("2026-11-03T02:00:00.000Z")}
        today={TODAY}
        timeZone={TZ}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: "Ký ức gần nhất: Mưa đầu mùa · hôm qua",
      }),
    ).toBeInTheDocument();
  });
});
