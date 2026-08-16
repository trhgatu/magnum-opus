import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getMemories, getMemory } from "./memory";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Memory API adapter", () => {
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

    await getMemories({
      page: 2,
      limit: 20,
      search: "  summer afternoon  ",
      state: "ACTIVE",
      sortBy: "occurredOn",
      sortOrder: "desc",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/memories?page=2&limit=20&search=summer+afternoon" +
        "&state=ACTIVE&sortBy=occurredOn&sortOrder=desc",
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

    await getMemories({
      search: "   ",
    });

    expect(apiFetch).toHaveBeenCalledWith("/memories?page=1&limit=20");
  });

  it("loads one Memory through its owner-scoped endpoint", async () => {
    apiFetch.mockResolvedValue({});

    await getMemory("memory-id");

    expect(apiFetch).toHaveBeenCalledWith("/memories/memory-id");
  });
});
