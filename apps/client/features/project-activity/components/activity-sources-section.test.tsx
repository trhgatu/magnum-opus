// @vitest-environment jsdom

import type {
  ActivitySourceResponse,
  GitHubConnectionResponse,
  GitHubRepositoryResponse,
  WakaTimeConnectionResponse,
  WakaTimeProjectResponse,
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
  searchWakaTimeProjects,
  notifySuccess,
} = vi.hoisted(() => ({
  linkActivitySource: vi.fn(),
  unlinkActivitySource: vi.fn(),
  searchGitHubRepositories: vi.fn(),
  searchWakaTimeProjects: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/project-activity/actions/project-activity", () => ({
  linkActivitySource,
  unlinkActivitySource,
  searchGitHubRepositories,
  searchWakaTimeProjects,
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

const wakaTimeConnection = (
  overrides: Partial<WakaTimeConnectionResponse> = {},
): WakaTimeConnectionResponse => ({
  account: { id: "waka-user", username: "trhgatu" },
  status: "ACTIVE",
  lastVerifiedAt: "2026-10-01T00:00:00.000Z",
  connectedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const wakaTimeProject = (
  overrides: Partial<WakaTimeProjectResponse> = {},
): WakaTimeProjectResponse => ({
  id: "waka-2",
  name: "portfolio",
  lastHeartbeatAt: "2026-10-20T08:00:00.000Z",
  usedByProjects: [],
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
      wakaTimeConnection={null}
      timeZone="UTC"
      {...props}
    />,
  );

const openPicker = () =>
  fireEvent.click(screen.getByRole("combobox", { name: /Gắn repository/ }));

const openWakaTimePicker = () =>
  fireEvent.click(
    screen.getByRole("combobox", { name: "Gắn project WakaTime" }),
  );

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
  searchWakaTimeProjects.mockResolvedValue({
    status: "success",
    projects: [
      wakaTimeProject({ id: "waka-1", name: "magnum-opus" }),
      wakaTimeProject(),
    ],
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
        wakaTimeConnection={null}
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
      provider: "GITHUB",
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
        provider: "GITHUB",
        externalResourceId: "1002",
      }),
    );
  });

  it("names the provider of each source", () => {
    renderSection({
      sources: [
        source(),
        source({
          feedId: "feed-2",
          provider: "WAKATIME",
          externalResourceId: "waka-1",
          displayName: "magnum-opus",
        }),
      ],
    });

    expect(screen.getByText("GitHub")).toBeTruthy();
    expect(screen.getByText("WakaTime")).toBeTruthy();
  });

  it("lists only WakaTime projects not linked yet, then links the chosen one", async () => {
    linkActivitySource.mockResolvedValue({
      status: "success",
      source: source({
        feedId: "feed-2",
        provider: "WAKATIME",
        externalResourceId: "waka-2",
        displayName: "portfolio",
      }),
    });
    renderSection({
      wakaTimeConnection: wakaTimeConnection(),
      sources: [
        source({
          provider: "WAKATIME",
          externalResourceId: "waka-1",
          displayName: "magnum-opus",
        }),
      ],
    });

    openWakaTimePicker();
    const option = await screen.findByRole("option", {
      name: /portfolio.*Code gần nhất 20\/10\/2026/,
    });
    // Đã là nguồn của Project này: không hiện lại.
    expect(screen.queryByRole("option", { name: /magnum-opus/ })).toBeNull();

    fireEvent.click(option);

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã gắn portfolio"),
    );
    expect(linkActivitySource).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      provider: "WAKATIME",
      externalResourceId: "waka-2",
    });
  });

  it("keeps GitHub and WakaTime ids apart when hiding linked ones", async () => {
    searchWakaTimeProjects.mockResolvedValue({
      status: "success",
      projects: [wakaTimeProject({ id: "1001", name: "same-id" })],
    });
    // Repository 1001 đã gắn, nhưng project WakaTime "1001" là thứ khác.
    renderSection({
      wakaTimeConnection: wakaTimeConnection(),
      sources: [source()],
    });

    openWakaTimePicker();

    expect(await screen.findByRole("option", { name: /same-id/ })).toBeTruthy();
  });

  it("says when a WakaTime project has no coding time yet", async () => {
    searchWakaTimeProjects.mockResolvedValue({
      status: "success",
      projects: [wakaTimeProject({ lastHeartbeatAt: null })],
    });
    renderSection({ wakaTimeConnection: wakaTimeConnection() });

    openWakaTimePicker();

    expect(
      await screen.findByRole("option", {
        name: /portfolio.*Chưa có thời gian code/,
      }),
    ).toBeTruthy();
  });

  it("warns before linking a WakaTime project another project uses", async () => {
    searchWakaTimeProjects.mockResolvedValue({
      status: "success",
      projects: [
        wakaTimeProject({ usedByProjects: [{ id: "p2", title: "Portfolio" }] }),
      ],
    });
    linkActivitySource.mockResolvedValue({
      status: "success",
      source: source({ feedId: "feed-2", displayName: "portfolio" }),
    });
    renderSection({ wakaTimeConnection: wakaTimeConnection() });

    openWakaTimePicker();
    fireEvent.click(
      await screen.findByRole("option", { name: /Đang dùng cho: Portfolio/ }),
    );
    expect(screen.getByText(/sẽ xuất hiện ở mọi Project dùng nó/)).toBeTruthy();
    expect(linkActivitySource).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gắn portfolio" }));
    await waitFor(() =>
      expect(linkActivitySource).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        provider: "WAKATIME",
        externalResourceId: "waka-2",
      }),
    );
  });

  it("searches WakaTime projects by name once typing stops", async () => {
    renderSection({ wakaTimeConnection: wakaTimeConnection() });

    openWakaTimePicker();
    await screen.findByRole("option", { name: /portfolio/ });
    fireEvent.change(screen.getByLabelText("Tìm project WakaTime"), {
      target: { value: "port" },
    });

    await waitFor(() =>
      expect(searchWakaTimeProjects).toHaveBeenLastCalledWith("port"),
    );
    expect(searchWakaTimeProjects).toHaveBeenCalledTimes(2);
  });

  it("explains a failed WakaTime search inside the picker", async () => {
    searchWakaTimeProjects.mockResolvedValue({
      status: "error",
      code: "WAKATIME_RATE_LIMITED",
      message: "generic",
    });
    renderSection({ wakaTimeConnection: wakaTimeConnection() });

    openWakaTimePicker();

    expect(
      await screen.findByText(
        "WakaTime đang tạm giới hạn truy cập. Thử lại sau ít phút.",
      ),
    ).toBeTruthy();
  });

  it("links WakaTime projects without a GitHub connection", () => {
    renderSection({
      connection: null,
      wakaTimeConnection: wakaTimeConnection(),
    });

    expect(
      screen.getByRole("combobox", { name: "Gắn project WakaTime" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: /Gắn repository/ }),
    ).toBeNull();
    expect(screen.getByText(/Cần kết nối GitHub trước/)).toBeTruthy();
  });

  it("invites connecting WakaTime without blocking GitHub", () => {
    renderSection();

    expect(
      screen
        .getByRole("link", { name: "Kết nối WakaTime ở Cài đặt" })
        .getAttribute("href"),
    ).toBe("/settings");
    expect(
      screen.getByRole("combobox", { name: /Gắn repository/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Gắn project WakaTime" }),
    ).toBeNull();
  });

  it("refuses new WakaTime links while the key no longer works", () => {
    renderSection({
      wakaTimeConnection: wakaTimeConnection({ status: "REVOKED" }),
    });

    expect(
      screen.getByRole("link", { name: "Cập nhật key ở Cài đặt" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Gắn project WakaTime" }),
    ).toBeNull();
  });

  it("refuses new WakaTime links when the connection cannot be read", () => {
    renderSection({ wakaTimeConnection: "unavailable" });

    expect(
      screen.getByText(/Chưa tải được trạng thái kết nối WakaTime/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("combobox", { name: "Gắn project WakaTime" }),
    ).toBeNull();
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
