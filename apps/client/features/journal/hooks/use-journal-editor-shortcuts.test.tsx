// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useJournalEditorShortcuts } from "./use-journal-editor-shortcuts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const press = (key: string, input: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", {
    key,
    cancelable: true,
    ...input,
  });
  window.dispatchEvent(event);
  return event;
};

describe("useJournalEditorShortcuts", () => {
  it("maps editor shortcuts and prevents browser defaults", () => {
    const handlers = {
      onSave: vi.fn(),
      onTogglePreview: vi.fn(),
      onToggleFocus: vi.fn(),
      onExitFocus: vi.fn(),
    };
    renderHook(() =>
      useJournalEditorShortcuts({
        enabled: true,
        focusMode: true,
        ...handlers,
      }),
    );

    expect(press("s", { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(press("P", { metaKey: true, shiftKey: true }).defaultPrevented).toBe(
      true,
    );
    expect(press("f", { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(
      true,
    );
    expect(press("Escape").defaultPrevented).toBe(true);

    expect(handlers.onSave).toHaveBeenCalledOnce();
    expect(handlers.onTogglePreview).toHaveBeenCalledOnce();
    expect(handlers.onToggleFocus).toHaveBeenCalledOnce();
    expect(handlers.onExitFocus).toHaveBeenCalledOnce();
  });

  it("does not save a read-only entry", () => {
    const onSave = vi.fn();
    renderHook(() =>
      useJournalEditorShortcuts({
        enabled: false,
        focusMode: false,
        onSave,
        onTogglePreview: vi.fn(),
        onToggleFocus: vi.fn(),
        onExitFocus: vi.fn(),
      }),
    );

    expect(press("s", { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});
