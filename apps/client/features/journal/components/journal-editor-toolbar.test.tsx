// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JournalEditorToolbar } from "./journal-editor-toolbar";

const createProps = () => ({
  state: "DRAFT" as const,
  saveState: "saved" as const,
  dirty: false,
  editable: true,
  viewMode: "write" as const,
  focusMode: false,
  busy: false,
  onBack: vi.fn(),
  onSave: vi.fn(),
  onViewModeChange: vi.fn(),
  onToggleFocus: vi.fn(),
  onChangeState: vi.fn(),
  onDeletePermanently: vi.fn(),
  onCreateMemory: vi.fn(),
});

afterEach(cleanup);

describe("JournalEditorToolbar", () => {
  it("offers to create a Memory from an available entry", () => {
    const props = createProps();

    render(<JournalEditorToolbar {...props} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Giữ lại như ký ức",
      }),
    );

    expect(props.onCreateMemory).toHaveBeenCalledOnce();
  });

  it("does not offer a trashed entry as a Memory source", () => {
    const props = createProps();

    render(<JournalEditorToolbar {...props} state="TRASHED" />);

    expect(
      screen.queryByRole("button", {
        name: "Giữ lại như ký ức",
      }),
    ).toBeNull();
  });

  it("blocks the action while the persisted entry is in conflict", () => {
    const props = createProps();

    render(<JournalEditorToolbar {...props} saveState="conflict" />);

    expect(
      (
        screen.getByRole("button", {
          name: "Giữ lại như ký ức",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
