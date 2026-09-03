// @vitest-environment jsdom

import type { MemoryResponse } from "@repo/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JournalLinkedMemories } from "./journal-linked-memories";

afterEach(cleanup);

const memory = (overrides: Partial<MemoryResponse> = {}): MemoryResponse => ({
  id: "memory-1",
  sourceJournalEntryId: "entry-1",
  title: "A quiet afternoon",
  content: "Rain moved slowly across the empty platform.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH",
  state: "ACTIVE",
  revision: 1,
  trashedAt: null,
  createdAt: "2024-08-01T00:00:00.000Z",
  updatedAt: "2024-08-01T00:00:00.000Z",
  ...overrides,
});

describe("JournalLinkedMemories", () => {
  it("renders every memory created from the entry", () => {
    render(
      <JournalLinkedMemories
        memories={[memory()]}
        totalCount={1}
        canCreateMemory
        createDisabled={false}
        onCreateMemory={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ký ức từ trang này" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: /Mở ký ức: A quiet afternoon/ }),
    ).not.toBeNull();
  });

  it("flushes the draft through the same handler as the toolbar before creating a Memory", () => {
    const onCreateMemory = vi.fn();
    render(
      <JournalLinkedMemories
        memories={[]}
        totalCount={0}
        canCreateMemory
        createDisabled={false}
        onCreateMemory={onCreateMemory}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Giữ lại như ký ức/ }));
    expect(onCreateMemory).toHaveBeenCalledTimes(1);
  });

  it("disables the action while the draft is busy, conflicted or unrecoverable", () => {
    render(
      <JournalLinkedMemories
        memories={[]}
        totalCount={0}
        canCreateMemory
        createDisabled
        onCreateMemory={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: /Giữ lại như ký ức/ })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("hides the action once the entry is trashed", () => {
    render(
      <JournalLinkedMemories
        memories={[]}
        totalCount={0}
        canCreateMemory={false}
        createDisabled={false}
        onCreateMemory={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Giữ lại như ký ức/ }),
    ).toBeNull();
  });

  it("mentions how many memories are not shown when the list is truncated", () => {
    render(
      <JournalLinkedMemories
        memories={[memory()]}
        totalCount={4}
        canCreateMemory
        createDisabled={false}
        onCreateMemory={vi.fn()}
      />,
    );

    expect(screen.getByText("và 3 ký ức khác từ trang này.")).not.toBeNull();
  });

  it("shows an empty message when no memory was created from the entry yet", () => {
    render(
      <JournalLinkedMemories
        memories={[]}
        totalCount={0}
        canCreateMemory
        createDisabled={false}
        onCreateMemory={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Chưa có ký ức nào được lưu từ trang này."),
    ).not.toBeNull();
  });
});
