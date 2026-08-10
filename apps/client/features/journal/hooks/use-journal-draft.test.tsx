// @vitest-environment jsdom

import type { JournalEntryResponse } from "@repo/contracts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useJournalDraft } from "./use-journal-draft";

const entry: JournalEntryResponse = {
  id: "36cbf877-1462-42bd-b18a-42577960784a",
  title: "A thought",
  content: "Something worth keeping",
  state: "DRAFT",
  stateBeforeTrash: null,
  revision: 2,
  trashedAt: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:01:00.000Z",
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useJournalDraft", () => {
  it("normalizes and saves the latest draft at the expected revision", async () => {
    const saveDraft = vi.fn().mockResolvedValue({
      status: "success",
      entry: { ...entry, title: null, content: "Changed", revision: 3 },
    });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => {
      result.current.setTitle("   ");
      result.current.setContent("Changed");
    });

    expect(result.current.isDirty).toBe(true);
    await act(async () => expect(await result.current.flush()).toBe(true));

    expect(saveDraft).toHaveBeenCalledWith({
      id: entry.id,
      title: null,
      content: "Changed",
      expectedRevision: 2,
    });
    expect(result.current.revision).toBe(3);
    expect(result.current.saveState).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("serializes a newer edit made while a save is active", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstSave = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const saveDraft = vi
      .fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce({
        status: "success",
        entry: { ...entry, content: "Second", revision: 4 },
      });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => result.current.setContent("First"));
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.flush();
    });
    act(() => result.current.setContent("Second"));
    await act(async () => {
      resolveFirst?.({
        status: "success",
        entry: { ...entry, content: "First", revision: 3 },
      });
      await saving;
    });

    expect(saveDraft).toHaveBeenNthCalledWith(2, {
      id: entry.id,
      title: entry.title,
      content: "Second",
      expectedRevision: 3,
    });
    expect(result.current.revision).toBe(4);
    expect(result.current.isDirty).toBe(false);
  });

  it("keeps local content and identifies revision conflicts", async () => {
    const saveDraft = vi.fn().mockResolvedValue({
      status: "error",
      code: "JOURNAL_ENTRY_REVISION_CONFLICT",
      message: "Conflict",
    });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => result.current.setContent("Local version"));
    await act(async () => expect(await result.current.flush()).toBe(false));

    expect(result.current.content).toBe("Local version");
    expect(result.current.isDirty).toBe(true);
    expect(result.current.saveState).toBe("conflict");
    expect(result.current.message).toContain("thay đổi ở nơi khác");
  });

  it("autosaves a dirty draft after the debounce window", async () => {
    vi.useFakeTimers();
    const saveDraft = vi.fn().mockResolvedValue({
      status: "success",
      entry: { ...entry, content: "Autosaved", revision: 3 },
    });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => result.current.setContent("Autosaved"));
    expect(saveDraft).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(800));

    expect(saveDraft).toHaveBeenCalledOnce();
    expect(result.current.saveState).toBe("saved");
  });

  it("restarts the debounce window after every edit", async () => {
    vi.useFakeTimers();
    const saveDraft = vi.fn().mockResolvedValue({
      status: "success",
      entry: { ...entry, content: "Second edit", revision: 3 },
    });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => result.current.setContent("First edit"));
    await act(async () => vi.advanceTimersByTimeAsync(700));
    act(() => result.current.setContent("Second edit"));
    await act(async () => vi.advanceTimersByTimeAsync(700));

    expect(saveDraft).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(100));

    expect(saveDraft).toHaveBeenCalledOnce();
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Second edit" }),
    );
  });

  it("accepts a lifecycle response as the new persisted baseline", async () => {
    const { result } = renderHook(() => useJournalDraft(entry));
    const sealed = { ...entry, state: "SEALED" as const, revision: 3 };

    act(() => result.current.acceptPersistedEntry(sealed));

    await waitFor(() => expect(result.current.entry.state).toBe("SEALED"));
    expect(result.current.editable).toBe(false);
    expect(result.current.revision).toBe(3);
    expect(result.current.getRevision()).toBe(3);
    expect(result.current.isDirty).toBe(false);
  });

  it("rebases local work onto a newer persisted revision", async () => {
    const saveDraft = vi.fn().mockResolvedValue({
      status: "success",
      entry: { ...entry, content: "Local version", revision: 4 },
    });
    const { result } = renderHook(() => useJournalDraft(entry, { saveDraft }));

    act(() => result.current.setContent("Local version"));
    act(() =>
      result.current.rebaseOnto({
        ...entry,
        content: "Remote version",
        revision: 3,
      }),
    );

    expect(result.current.content).toBe("Local version");
    expect(result.current.getRevision()).toBe(3);
    expect(result.current.isDirty).toBe(true);

    await act(async () => expect(await result.current.flush()).toBe(true));
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Local version",
        expectedRevision: 3,
      }),
    );
  });
});
