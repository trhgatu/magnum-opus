// @vitest-environment jsdom

import type {
  ActivitySourceResponse,
  GitHubConnectionResponse,
  GitHubRepositoryResponse,
} from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  linkActivitySource,
  unlinkActivitySource,
  searchGitHubRepositories,
  notifySuccess,
} = vi.hoisted(() => ({
  linkActivitySource: vi.fn(),
  unlinkActivitySource: vi.fn(),
  searchGitHubRepositories: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/project-activity/actions/project-activity", () => ({
  linkActivitySource,
  unlinkActivitySource,
  searchGitHubRepositories,
}));
vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { ActivitySourcesSection } from "./activity-sources-section";

const PROJECT_ID = "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d";

const source = (
  overrides: Partial<ActivitySourceResponse> = {},
): ActivitySourceResponse => ({
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
  ...overrides,
});

const repository = (
  overrides: Partial<GitHubRepositoryResponse> = {},
): GitHubRepositoryResponse => ({
  externalResourceId: "1002",
  fullName: "trhgatu/portfolio",
  isPrivate: false,
  pushedAt: null,
  usedByProjects: [],
  ...overrides,
});

const connection = (
  overrides: Partial<GitHubConnectionResponse> = {},
): GitHubConnectionResponse => ({
  accountLogin: "trhgatu",
  status: "ACTIVE",
  expiresAt: null,
  lastVerifiedAt: "2026-10-01T00:00:00.000Z",
  connectedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const renderSection = (
  props: Partial<Parameters<typeof ActivitySourcesSection>[0]> = {},
) =>
  render(
    <ActivitySourcesSection
      projectId={PROJECT_ID}
      sources={[]}
      connection={connection()}
      timeZone="UTC"
      {...props}
    />,
  );

const openPicker = () =>
  fireEvent.click(screen.getByRole("combobox", { name: /Gắn repository/ }));

beforeEach(() => {
  vi.clearAllMocks();
  searchGitHubRepositories.mockResolvedValue({
    status: "success",
    repositories: [
      repository({
        externalResourceId: "1001",
        fullName: "trhgatu/magnum-opus",
      }),
      repository(),
    ],
    truncated: false,
  });
});
afterEach(cleanup);

describe("ActivitySourcesSection", () => {
  it("points to Settings when GitHub is not connected, with nothing to link", () => {
    renderSection({ connection: null });

    expect(
      screen
        .getByRole("link", { name: "Kết nối ở Cài đặt" })
        .getAttribute("href"),
    ).toBe("/settings");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("keeps the sources but refuses new links while the connection is unusable", () => {
    renderSection({
      connection: connection({ status: "EXPIRED" }),
      sources: [source()],
    });

    expect(screen.getByText("trhgatu/magnum-opus")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Cập nhật token ở Cài đặt" }),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("keeps the sources and their unlink when the connection cannot be read", () => {
    renderSection({ connection: "unavailable", sources: [source()] });

    expect(
      screen.getByText(/Chưa tải được trạng thái kết nối GitHub/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Gỡ trhgatu/magnum-opus" }),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("stops offering new links once the token expires while the page is open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderSection({
        connection: connection({
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      });
      expect(screen.getByRole("combobox")).toBeTruthy();

      await vi.advanceTimersByTimeAsync(61_000);

      expect(
        await screen.findByRole("link", { name: "Cập nhật token ở Cài đặt" }),
      ).toBeTruthy();
      expect(screen.queryByRole("combobox")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("takes the server's list again when the page is refreshed", () => {
    const { rerender } = renderSection({ sources: [source()] });

    rerender(
      <ActivitySourcesSection
        projectId={PROJECT_ID}
        sources={[
          source({ status: "ERROR", error: { code: "GITHUB_TOKEN_REVOKED" } }),
        ]}
        connection={connection()}
        timeZone="UTC"
      />,
    );

    expect(
      screen.getByText("GitHub đã thu hồi token — cập nhật ở Cài đặt."),
    ).toBeTruthy();
  });

  it("moves an update time to its date once midnight passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-18T23:59:30.000Z"));
    try {
      renderSection({
        connection: connection({ expiresAt: null }),
        sources: [source({ lastSyncAt: "2026-10-18T23:50:00.000Z" })],
      });
      expect(screen.getByText("Cập nhật lúc 23:50")).toBeTruthy();

      await vi.advanceTimersByTimeAsync(61_000);

      expect(await screen.findByText("Cập nhật lúc 18/10/2026")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows each source with its status and error copy", () => {
    renderSection({
      sources: [
        source({
          status: "ERROR",
          error: { code: "GITHUB_REPOSITORY_NOT_ACCESSIBLE" },
        }),
      ],
    });

    expect(screen.getByText("Lỗi")).toBeTruthy();
    expect(
      screen.getByText(
        "Không đọc được repository — kiểm tra quyền của token hoặc repository.",
      ),
    ).toBeTruthy();
  });

  it("lists only repositories not linked yet, then links the chosen one", async () => {
    linkActivitySource.mockResolvedValue({
      status: "success",
      source: source({
        feedId: "feed-2",
        externalResourceId: "1002",
        displayName: "trhgatu/portfolio",
      }),
    });
    renderSection({ sources: [source()] });

    openPicker();
    const option = await screen.findByRole("option", {
      name: /trhgatu\/portfolio/,
    });
    // Đã là nguồn của Project này: không hiện lại.
    expect(
      screen.queryByRole("option", { name: /trhgatu\/magnum-opus/ }),
    ).toBeNull();

    fireEvent.click(option);

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã gắn trhgatu/portfolio"),
    );
    expect(linkActivitySource).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      externalResourceId: "1002",
    });
    expect(await screen.findByText("trhgatu/portfolio")).toBeTruthy();
  });

  it("warns before linking a repository another project uses", async () => {
    searchGitHubRepositories.mockResolvedValue({
      status: "success",
      repositories: [
        repository({ usedByProjects: [{ id: "p2", title: "Portfolio" }] }),
      ],
      truncated: true,
    });
    linkActivitySource.mockResolvedValue({
      status: "success",
      source: source({ feedId: "feed-2", displayName: "trhgatu/portfolio" }),
    });
    renderSection();

    openPicker();
    const option = await screen.findByRole("option", {
      name: /Đang dùng cho: Portfolio/,
    });
    expect(
      screen.getByText(/Gõ tên repository để thu hẹp danh sách/),
    ).toBeTruthy();

    fireEvent.click(option);
    expect(screen.getByText(/sẽ xuất hiện ở mọi Project dùng nó/)).toBeTruthy();
    expect(linkActivitySource).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Gắn trhgatu/portfolio" }),
    );
    await waitFor(() =>
      expect(linkActivitySource).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        externalResourceId: "1002",
      }),
    );
  });

  it("keeps the source listed and explains a failed unlink", async () => {
    unlinkActivitySource.mockResolvedValue({
      status: "error",
      message: "Không thể kết nối tới dịch vụ.",
    });
    renderSection({ sources: [source()] });

    fireEvent.click(
      screen.getByRole("button", { name: "Gỡ trhgatu/magnum-opus" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Gỡ" }));

    expect(
      await screen.findByText("Không thể kết nối tới dịch vụ."),
    ).toBeTruthy();
    expect(screen.getByText("trhgatu/magnum-opus")).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("explains a failed link", async () => {
    linkActivitySource.mockResolvedValue({
      status: "error",
      code: "GITHUB_REPOSITORY_NOT_ACCESSIBLE",
      message: "generic",
    });
    renderSection();

    openPicker();
    fireEvent.click(
      await screen.findByRole("option", { name: /trhgatu\/portfolio/ }),
    );

    expect(
      await screen.findByText(
        "Không đọc được repository này — kiểm tra quyền của token.",
      ),
    ).toBeTruthy();
  });

  it("unlinks only after confirmation", async () => {
    unlinkActivitySource.mockResolvedValue({ status: "success" });
    renderSection({ sources: [source()] });

    fireEvent.click(
      screen.getByRole("button", { name: "Gỡ trhgatu/magnum-opus" }),
    );
    expect(
      screen.getByText("Gỡ trhgatu/magnum-opus khỏi Project?"),
    ).toBeTruthy();
    expect(unlinkActivitySource).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gỡ" }));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã gỡ trhgatu/magnum-opus"),
    );
    expect(unlinkActivitySource).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      feedId: "feed-1",
    });
    await waitFor(() =>
      expect(screen.queryByText("trhgatu/magnum-opus")).toBeNull(),
    );
  });
});
