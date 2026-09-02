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

const {
  changeMemoryState,
  deleteMemoryPermanently,
  push,
  replace,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  changeMemoryState: vi.fn(),
  deleteMemoryPermanently: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    refresh,
  }),
}));

vi.mock("@/features/memory/actions/memory", () => ({
  changeMemoryState,
  deleteMemoryPermanently,
}));

vi.mock("@/lib/toast", () => ({
  notifySuccess,
}));

const redirectError = (url: string) =>
  Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;replace;${url};307;`,
  });

import { MemoryLifecycleControls } from "./memory-lifecycle-controls";

const memoryId = "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676";
const revision = 3;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("MemoryLifecycleControls", () => {
  it("moves an active Memory to Trash", async () => {
    changeMemoryState.mockResolvedValue({
      status: "success",
      memory: {
        id: memoryId,
      },
    });

    render(
      <MemoryLifecycleControls
        id={memoryId}
        title="Buổi chiều bên cửa sổ"
        state="ACTIVE"
        revision={revision}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Khôi phục",
      }),
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "Xóa vĩnh viễn",
      }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Đưa vào Thùng rác",
      }),
    );

    await waitFor(() =>
      expect(changeMemoryState).toHaveBeenCalledWith({
        id: memoryId,
        action: "trash",
        expectedRevision: revision,
      }),
    );

    // Trash không rời trang — chỉ refresh để re-render đúng state tại chỗ.
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("restores a trashed Memory", async () => {
    changeMemoryState.mockResolvedValue({
      status: "success",
      memory: {
        id: memoryId,
      },
    });

    render(
      <MemoryLifecycleControls
        id={memoryId}
        title="Buổi chiều bên cửa sổ"
        state="TRASHED"
        revision={revision}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Đưa vào Thùng rác",
      }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Khôi phục",
      }),
    );

    await waitFor(() =>
      expect(changeMemoryState).toHaveBeenCalledWith({
        id: memoryId,
        action: "restore",
        expectedRevision: revision,
      }),
    );

    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires confirmation before permanently deleting a Memory", async () => {
    // deleteMemoryPermanently không bao giờ "return" khi thành công — Server
    // Action tự redirect() trên server, Next.js hiện thực điều đó bằng cách
    // throw một lỗi có digest NEXT_REDIRECT. Mock đúng hành vi thật thay vì
    // một status:"success" không có thật trong runtime.
    //
    // Component cố ý re-throw lỗi đó sau khi xử lý (bắt buộc theo tài liệu
    // Next.js, để runtime thật của framework tự thực hiện điều hướng) — môi
    // trường test không có runtime đó để "tiêu thụ" rejection, nên bắt nó ở
    // đây để xác nhận đúng hành vi thay vì để lọt ra thành unhandled error.
    // React 19 báo lỗi ném ra từ async transition function qua reportError()
    // (uncaughtException), không phải theo đường unhandledRejection thông
    // thường — bắt đúng event đó để xác nhận rồi mới coi test hoàn tất.
    const redirectRejection = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.off("uncaughtException", handler);
        reject(
          new Error(
            "Expected a NEXT_REDIRECT uncaughtException, but none occurred",
          ),
        );
      }, 1000);

      const handler = (error: unknown) => {
        const digest =
          typeof error === "object" && error !== null && "digest" in error
            ? (error as { digest?: unknown }).digest
            : undefined;

        if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) {
          return;
        }

        clearTimeout(timeout);
        process.off("uncaughtException", handler);
        resolve();
      };

      process.on("uncaughtException", handler);
    });

    deleteMemoryPermanently.mockRejectedValue(
      redirectError("/memories?state=TRASHED"),
    );

    render(
      <MemoryLifecycleControls
        id={memoryId}
        title="Buổi chiều bên cửa sổ"
        state="TRASHED"
        revision={revision}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Xóa vĩnh viễn",
      }),
    );

    expect(deleteMemoryPermanently).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog).getByRole("heading", {
        name: "Xóa vĩnh viễn ký ức này?",
      }),
    ).toBeTruthy();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Xóa vĩnh viễn",
      }),
    );

    await waitFor(() =>
      expect(deleteMemoryPermanently).toHaveBeenCalledWith({
        id: memoryId,
        expectedRevision: revision,
      }),
    );

    // Điều hướng thật diễn ra qua redirect() phía server (Next.js tự xử lý
    // NEXT_REDIRECT) — component không tự gọi router.replace/push nữa.
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'Đã xóa vĩnh viễn "Buổi chiều bên cửa sổ"',
      ),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    await redirectRejection;
  });

  it("offers to reload when the revision is stale", async () => {
    changeMemoryState.mockResolvedValue({
      status: "error",
      message: "Ký ức đã thay đổi ở một phiên làm việc khác.",
      kind: "conflict",
      code: "MEMORY_REVISION_CONFLICT",
    });

    render(
      <MemoryLifecycleControls
        id={memoryId}
        title="Buổi chiều bên cửa sổ"
        state="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Đưa vào Thùng rác",
      }),
    );

    expect(
      await screen.findByText("Ký ức đã thay đổi ở một phiên làm việc khác."),
    ).toBeTruthy();

    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tải bản mới nhất",
      }),
    );

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the confirmation open when permanent deletion fails", async () => {
    deleteMemoryPermanently.mockResolvedValue({
      status: "error",
      message: "Chỉ ký ức trong Trash mới có thể bị xóa vĩnh viễn.",
      kind: "conflict",
      code: "MEMORY_PERMANENT_DELETE_FORBIDDEN",
    });

    render(
      <MemoryLifecycleControls
        id={memoryId}
        title="Buổi chiều bên cửa sổ"
        state="TRASHED"
        revision={revision}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Xóa vĩnh viễn",
      }),
    );

    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Xóa vĩnh viễn",
      }),
    );

    expect(
      await within(dialog).findByText(
        "Chỉ ký ức trong Trash mới có thể bị xóa vĩnh viễn.",
      ),
    ).toBeTruthy();

    expect(deleteMemoryPermanently).toHaveBeenCalledWith({
      id: memoryId,
      expectedRevision: revision,
    });

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
