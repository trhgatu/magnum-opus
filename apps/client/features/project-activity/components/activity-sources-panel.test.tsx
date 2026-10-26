// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getActivitySources,
  getGitHubConnection,
  getWakaTimeConnection,
  getCurrentUser,
} = vi.hoisted(() => ({
  getActivitySources: vi.fn(),
  getGitHubConnection: vi.fn(),
  getWakaTimeConnection: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/project-activity/api/project-activity", () => ({
  getActivitySources,
}));
vi.mock("@/features/github/api/github-connection", () => ({
  getGitHubConnection,
}));
vi.mock("@/features/wakatime/api/wakatime-connection", () => ({
  getWakaTimeConnection,
}));
vi.mock("@/features/account/api/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/project-activity/actions/project-activity", () => ({
  linkActivitySource: vi.fn(),
  unlinkActivitySource: vi.fn(),
  searchGitHubRepositories: vi.fn(),
  searchWakaTimeProjects: vi.fn(),
}));

import { ActivitySourcesPanel } from "./activity-sources-panel";

const PROJECT_ID = "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d";

const source = {
  feedId: "feed-1",
  provider: "GITHUB",
  externalResourceId: "1001",
  displayName: "trhgatu/magnum-opus",
  status: "ACTIVE",
  linkedAt: "2026-10-01T00:00:00.000Z",
  lastSyncAt: null,
  coveredFrom: null,
  syncedUntil: null,
  error: null,
};

const renderPanel = async () =>
  render(await ActivitySourcesPanel({ projectId: PROJECT_ID }));

beforeEach(() => {
  vi.clearAllMocks();
  getActivitySources.mockResolvedValue([source]);
  getCurrentUser.mockResolvedValue({ timeZone: "UTC" });
  getGitHubConnection.mockResolvedValue({
    accountLogin: "trhgatu",
    status: "ACTIVE",
    expiresAt: null,
    lastVerifiedAt: "2026-10-01T00:00:00.000Z",
    connectedAt: "2026-10-01T00:00:00.000Z",
  });
  getWakaTimeConnection.mockResolvedValue(null);
});
afterEach(cleanup);

describe("ActivitySourcesPanel", () => {
  it("offers linking with an active connection", async () => {
    await renderPanel();

    expect(getActivitySources).toHaveBeenCalledWith(PROJECT_ID);
    expect(screen.getByText("trhgatu/magnum-opus")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Gắn repository" }),
    ).toBeTruthy();
  });

  it("points to Settings without a connection", async () => {
    getGitHubConnection.mockResolvedValue(null);

    await renderPanel();

    expect(
      screen.getByRole("link", { name: "Kết nối ở Cài đặt" }),
    ).toBeTruthy();
  });

  it("blocks new links for a revoked connection", async () => {
    getGitHubConnection.mockResolvedValue({
      accountLogin: "trhgatu",
      status: "REVOKED",
      expiresAt: null,
      lastVerifiedAt: "2026-10-01T00:00:00.000Z",
      connectedAt: "2026-10-01T00:00:00.000Z",
    });

    await renderPanel();

    expect(
      screen.getByRole("link", { name: "Cập nhật token ở Cài đặt" }),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("still lists the sources when the connection cannot be read", async () => {
    getGitHubConnection.mockRejectedValue(new Error("integrations down"));

    await renderPanel();

    expect(screen.getByText("trhgatu/magnum-opus")).toBeTruthy();
    expect(
      screen.getByText(/Chưa tải được trạng thái kết nối GitHub/),
    ).toBeTruthy();
  });

  it("offers WakaTime projects with an active WakaTime connection", async () => {
    getWakaTimeConnection.mockResolvedValue({
      account: { id: "waka-user", username: "trhgatu" },
      status: "ACTIVE",
      lastVerifiedAt: "2026-10-01T00:00:00.000Z",
      connectedAt: "2026-10-01T00:00:00.000Z",
    });

    await renderPanel();

    expect(
      screen.getByRole("combobox", { name: "Gắn project WakaTime" }),
    ).toBeTruthy();
  });

  it("keeps GitHub usable when the WakaTime connection cannot be read", async () => {
    getWakaTimeConnection.mockRejectedValue(new Error("integrations down"));

    await renderPanel();

    expect(
      screen.getByText(/Chưa tải được trạng thái kết nối WakaTime/),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Gắn repository" }),
    ).toBeTruthy();
  });

  it("reads the connection alongside the sources, not after them", async () => {
    let sourcesSettled = false;
    let calledBeforeSourcesSettled = false;
    getActivitySources.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            sourcesSettled = true;
            resolve([source]);
          }, 20),
        ),
    );
    let wakaTimeBeforeSourcesSettled = false;
    getGitHubConnection.mockImplementation(async () => {
      // Ghi lại rồi kiểm bên ngoài: lỗi trong mock sẽ bị panel bắt mất.
      calledBeforeSourcesSettled = !sourcesSettled;
      return null;
    });
    getWakaTimeConnection.mockImplementation(async () => {
      wakaTimeBeforeSourcesSettled = !sourcesSettled;
      return null;
    });

    await renderPanel();

    expect(getGitHubConnection).toHaveBeenCalledTimes(1);
    expect(calledBeforeSourcesSettled).toBe(true);
    expect(getWakaTimeConnection).toHaveBeenCalledTimes(1);
    expect(wakaTimeBeforeSourcesSettled).toBe(true);
  });

  it("shows its own error when the sources cannot be read", async () => {
    getActivitySources.mockRejectedValue(new Error("down"));

    await renderPanel();

    expect(
      screen.getByText(
        "Chưa tải được nguồn hoạt động. Tải lại trang để thử lại.",
      ),
    ).toBeTruthy();
  });
});
