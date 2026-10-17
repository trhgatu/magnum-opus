// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getActivitySources, getGitHubConnection, getCurrentUser } = vi.hoisted(
  () => ({
    getActivitySources: vi.fn(),
    getGitHubConnection: vi.fn(),
    getCurrentUser: vi.fn(),
  }),
);

vi.mock("@/features/project-activity/api/project-activity", () => ({
  getActivitySources,
}));
vi.mock("@/features/github/api/github-connection", () => ({
  getGitHubConnection,
}));
vi.mock("@/features/account/api/current-user", () => ({ getCurrentUser }));
vi.mock("@/features/project-activity/actions/project-activity", () => ({
  linkActivitySource: vi.fn(),
  unlinkActivitySource: vi.fn(),
  searchGitHubRepositories: vi.fn(),
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
