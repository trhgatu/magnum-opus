import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getProject, getProjects } from "./project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Project API adapter", () => {
  it("encodes list filters without sending owner identity", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 20,
        totalPages: 0,
        currentPage: 2,
      },
    });

    await getProjects({
      page: 2,
      limit: 20,
      search: "  crucible v1  ",
      state: "ACTIVE",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/projects?page=2&limit=20&search=crucible+v1&state=ACTIVE",
    );
  });

  it("uses defaults and omits empty optional filters", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 20,
        totalPages: 0,
        currentPage: 1,
      },
    });

    await getProjects({
      search: "   ",
    });

    expect(apiFetch).toHaveBeenCalledWith("/projects?page=1&limit=20");
  });

  it("loads a single owned Project", async () => {
    apiFetch.mockResolvedValue({});

    await getProject("project-id");

    expect(apiFetch).toHaveBeenCalledWith("/projects/project-id");
  });
});
