// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const onNavigate = vi.fn((event: { preventDefault: () => void }) =>
  // jsdom không điều hướng thật; chặn để không in cảnh báo.
  event.preventDefault(),
);

function Form({
  enabled,
  href = "/journal?page=2#entry",
  target,
  showLink = true,
}: {
  enabled: boolean;
  showLink?: boolean;
  href?: string;
  target?: string;
}) {
  const leaveDialog = useUnsavedChangesWarning(enabled);
  return (
    <>
      {leaveDialog}
      {showLink ? (
        <a href={href} target={target} onClick={onNavigate}>
          Nhật ký
        </a>
      ) : null}
    </>
  );
}

beforeEach(() => {
  push.mockReset();
  onNavigate.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const link = () => screen.getByRole("link", { name: "Nhật ký" });
const ask = () =>
  screen.findByRole("alertdialog", { name: "Bỏ phần đang viết?" });
/** Hộp thoại tải lười: đợi chunk xong rồi mới khẳng định là nó không hiện. */
const settleLazyDialog = () =>
  act(async () => {
    await import("@/components/system/discard-dialog");
  });

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

  it("lets links through when nothing is unsaved", async () => {
    render(<Form enabled={false} />);

    fireEvent.click(link());
    await settleLazyDialog();

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it.each([
    ["a modifier click", {}, { ctrlKey: true }],
    ["a new tab", { target: "_blank" }, {}],
    ["a hash on the same page", { href: "#entry" }, {}],
  ])("does not ask for %s", async (_case, props, click) => {
    render(<Form enabled {...props} />);

    fireEvent.click(link(), click);
    await settleLazyDialog();

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("holds an internal link and stays when the user keeps editing", async () => {
    render(<Form enabled />);

    fireEvent.click(link());
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(
      within(await ask()).getByRole("button", { name: "Tiếp tục sửa" }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onNavigate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("clicks the link again once the user discards, so its handlers run", async () => {
    render(<Form enabled />);

    fireEvent.click(link());
    fireEvent.click(
      within(await ask()).getByRole("button", { name: "Bỏ thay đổi" }),
    );

    await waitFor(() => expect(onNavigate).toHaveBeenCalledOnce());
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates directly when the link is gone, like a closed menu", async () => {
    const { rerender } = render(<Form enabled />);

    fireEvent.click(link());
    const dialog = await ask();
    rerender(<Form enabled showLink={false} />);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Bỏ thay đổi" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/journal?page=2#entry"),
    );
  });
});
