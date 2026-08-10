// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("useUnsavedChangesWarning", () => {
  it("warns only while unsaved changes exist", () => {
    const preventDefault = vi.spyOn(Event.prototype, "preventDefault");
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useUnsavedChangesWarning(enabled),
      { initialProps: { enabled: false } },
    );

    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).not.toHaveBeenCalled();

    rerender({ enabled: true });
    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).toHaveBeenCalledOnce();

    unmount();
    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("blocks internal links when leaving would discard local work", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const link = document.createElement("a");
    link.href = "/journal";
    document.body.append(link);
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(confirm).toHaveBeenCalledOnce();
    expect(click.defaultPrevented).toBe(true);

    unmount();
    link.remove();
    confirm.mockRestore();
  });
});
