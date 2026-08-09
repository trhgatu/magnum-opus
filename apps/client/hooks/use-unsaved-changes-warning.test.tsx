// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";

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
});
