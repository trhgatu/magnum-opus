import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, revalidatePath } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return { ...actual, apiFetch };
});

import { ApiError } from "@/lib/api";

import {
  linkActivitySource,
  searchGitHubRepositories,
  searchWakaTimeProjects,
  unlinkActivitySource,
} from "./project-activity";

const PROJECT_ID = "6f1c2b8e-3d4a-4f5b-8c9d-0e1f2a3b4c5d";
const FEED_ID = "7a2d3c9f-4e5b-4a6c-9d0e-1f2a3b4c5d6e";

beforeEach(() => vi.clearAllMocks());

describe("searchGitHubRepositories", () => {
  it("searches on the server with the trimmed name", async () => {
    apiFetch.mockResolvedValue({ repositories: [], truncated: false });

    await expect(searchGitHubRepositories("  opus ")).resolves.toEqual({
      status: "success",
      repositories: [],
      truncated: false,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/integrations/github/repositories?search=opus",
    );
  });

  it("lists without a filter for an empty search", async () => {
    apiFetch.mockResolvedValue({ repositories: [], truncated: true });

    await searchGitHubRepositories("   ");

    expect(apiFetch).toHaveBeenCalledWith("/integrations/github/repositories");
  });

  it("returns API errors with their code", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "GITHUB_NOT_CONNECTED",
        message: "x",
      }),
    );

    await expect(searchGitHubRepositories("")).resolves.toMatchObject({
      status: "error",
      code: "GITHUB_NOT_CONNECTED",
    });
  });
});

describe("searchWakaTimeProjects", () => {
  it("searches on the server with the trimmed name", async () => {
    const projects = [
      {
        id: "p1",
        name: "magnum-opus",
        lastHeartbeatAt: null,
        usedByProjects: [],
      },
    ];
    apiFetch.mockResolvedValue(projects);

    await expect(searchWakaTimeProjects("  opus ")).resolves.toEqual({
      status: "success",
      projects,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/integrations/wakatime/projects?search=opus",
    );
  });

  it("lists without a filter for an empty search", async () => {
    apiFetch.mockResolvedValue([]);

    await searchWakaTimeProjects("   ");

    expect(apiFetch).toHaveBeenCalledWith("/integrations/wakatime/projects");
  });

  it("returns API errors with their code", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "WAKATIME_NOT_CONNECTED",
        message: "x",
      }),
    );

    await expect(searchWakaTimeProjects("")).resolves.toMatchObject({
      status: "error",
      code: "WAKATIME_NOT_CONNECTED",
    });
  });
});

describe("linkActivitySource", () => {
  it("links the repository and refreshes the project page", async () => {
    const source = { feedId: FEED_ID, displayName: "trhgatu/magnum-opus" };
    apiFetch.mockResolvedValue(source);

    await expect(
      linkActivitySource({
        projectId: PROJECT_ID,
        provider: "GITHUB",
        externalResourceId: "1067270000",
      }),
    ).resolves.toEqual({ status: "success", source });
    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/activity/sources`,
      {
        method: "POST",
        body: JSON.stringify({
          provider: "GITHUB",
          externalResourceId: "1067270000",
        }),
      },
    );
    // Chỉ trang chi tiết: trang chỉnh sửa không còn.
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
  });

  it("links a WakaTime project by its id", async () => {
    const source = { feedId: FEED_ID, displayName: "magnum-opus" };
    apiFetch.mockResolvedValue(source);
    const id = "8b1f2c3d-4e5f-4a6b-9c7d-0e1f2a3b4c5d";

    await expect(
      linkActivitySource({
        projectId: PROJECT_ID,
        provider: "WAKATIME",
        externalResourceId: id,
      }),
    ).resolves.toEqual({ status: "success", source });
    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/activity/sources`,
      {
        method: "POST",
        body: JSON.stringify({ provider: "WAKATIME", externalResourceId: id }),
      },
    );
  });

  it.each([
    [
      "a bad project id",
      { projectId: "x", provider: "GITHUB", externalResourceId: "1" },
    ],
    [
      "a repository name instead of its id",
      {
        projectId: PROJECT_ID,
        provider: "GITHUB",
        externalResourceId: "trhgatu/magnum-opus",
      },
    ],
    [
      "a leading zero",
      { projectId: PROJECT_ID, provider: "GITHUB", externalResourceId: "0106" },
    ],
    [
      "a WakaTime project name instead of its id",
      {
        projectId: PROJECT_ID,
        provider: "WAKATIME",
        externalResourceId: "magnum opus",
      },
    ],
    [
      "an unknown provider",
      { projectId: PROJECT_ID, provider: "GITLAB", externalResourceId: "1" },
    ],
  ])("rejects %s before calling the API", async (_label, input) => {
    await expect(
      linkActivitySource(input as Parameters<typeof linkActivitySource>[0]),
    ).resolves.toMatchObject({ status: "error" });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("failing API calls", () => {
  const failure = new ApiError({
    kind: "network",
    status: null,
    message: "Không thể kết nối tới dịch vụ.",
  });

  it("returns the error and refreshes nothing when linking fails", async () => {
    apiFetch.mockRejectedValue(failure);

    await expect(
      linkActivitySource({
        projectId: PROJECT_ID,
        provider: "GITHUB",
        externalResourceId: "1067270000",
      }),
    ).resolves.toMatchObject({
      status: "error",
      message: "Không thể kết nối tới dịch vụ.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the error and refreshes nothing when unlinking fails", async () => {
    apiFetch.mockRejectedValue(failure);

    await expect(
      unlinkActivitySource({ projectId: PROJECT_ID, feedId: FEED_ID }),
    ).resolves.toMatchObject({ status: "error" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("unlinkActivitySource", () => {
  it("unlinks the feed and refreshes the project page", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(
      unlinkActivitySource({ projectId: PROJECT_ID, feedId: FEED_ID }),
    ).resolves.toEqual({ status: "success" });
    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/activity/sources/${FEED_ID}`,
      { method: "DELETE" },
    );
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("rejects ids that are not UUIDs", async () => {
    await expect(
      unlinkActivitySource({ projectId: PROJECT_ID, feedId: "../x" }),
    ).resolves.toMatchObject({ status: "error" });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
