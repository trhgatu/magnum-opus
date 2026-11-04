import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

import { getJournalEntries, getJournalEntry } from "./journal";

beforeEach(() => vi.clearAllMocks());

describe("Journal API adapter", () => {
  it("encodes list filters without leaking owner identity", async () => {
    apiFetch.mockResolvedValue({ data: [], meta: {} });

    await getJournalEntries({
      page: 2,
      limit: 20,
      search: "  morning light  ",
      state: "SEALED",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/journal/entries?page=2&limit=20&search=morning+light&state=SEALED",
    );
  });

  it("asks for the newest pages first when sorting by creation", async () => {
    apiFetch.mockResolvedValue({ data: [], meta: {} });

    await getJournalEntries({ limit: 1, sortBy: "createdAt" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/journal/entries?page=1&limit=1&sortBy=createdAt",
    );
  });

  it("loads one entry through its owner-scoped backend endpoint", async () => {
    apiFetch.mockResolvedValue({});
    await getJournalEntry("entry-id");
    expect(apiFetch).toHaveBeenCalledWith("/journal/entries/entry-id");
  });
});
