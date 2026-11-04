// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Link from "next/link";

import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function Form({ enabled }: { enabled: boolean }) {
  const leaveDialog = useUnsavedChangesWarning(enabled);
  return (
    <>
      {leaveDialog}
      <Link href="/journal?page=2#entry">Nhật ký</Link>
    </>
  );
}

beforeEach(() => push.mockReset());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ask = () =>
  screen.findByRole("alertdialog", { name: "Bỏ phần đang viết?" });

describe("useUnsavedChangesWarning", () => {
  it("warns before unload only while unsaved changes exist", () => {
    const preventDefault = vi.spyOn(Event.prototype, "preventDefault");
    const { rerender, unmount } = render(<Form enabled={false} />);

    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).not.toHaveBeenCalled();

    rerender(<Form enabled />);
    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).toHaveBeenCalledOnce();

    unmount();
    window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("lets links through when nothing is unsaved", () => {
    render(<Form enabled={false} />);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Nhật ký" }).dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("stops an internal link and stays when the user keeps editing", async () => {
    render(<Form enabled />);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "Nhật ký" }).dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    fireEvent.click(
      within(await ask()).getByRole("button", { name: "Tiếp tục sửa" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it("follows the link once the user discards the changes", async () => {
    render(<Form enabled />);

    fireEvent.click(screen.getByRole("link", { name: "Nhật ký" }));
    fireEvent.click(
      within(await ask()).getByRole("button", { name: "Bỏ thay đổi" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/journal?page=2#entry"),
    );
  });
});
