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
  changeProjectLifecycle,
  deleteProjectPermanently,
  push,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  changeProjectLifecycle: vi.fn(),
  deleteProjectPermanently: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/project/actions/project", () => ({
  changeProjectLifecycle,
  deleteProjectPermanently,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

const redirectError = (url: string) =>
  Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;push;${url};307;`,
  });

import { ProjectLifecycleControls } from "./project-lifecycle-controls";

const projectId = "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676";
const title = "Xây dựng Crucible V1";
const revision = 3;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ProjectLifecycleControls", () => {
  it("only offers Start and Stop while NOT_STARTED", () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="NOT_STARTED"
        revision={revision}
      />,
    );

    expect(screen.getByRole("button", { name: "Bắt đầu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dừng lại" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tạm dừng" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hoàn thành" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mở lại" })).toBeNull();
    expect(screen.getByRole("button", { name: "Xóa vĩnh viễn" })).toBeTruthy();
  });

  it("offers Pause, Stop and Complete while ACTIVE, without a delete button", () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dừng lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hoàn thành" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xóa vĩnh viễn" })).toBeNull();
  });

  it("only offers Reopen while COMPLETED, without a delete button", () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="COMPLETED"
        revision={revision}
      />,
    );

    expect(screen.getByRole("button", { name: "Mở lại" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xóa vĩnh viễn" })).toBeNull();
  });

  it("offers Reopen and a delete button while STOPPED", () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="STOPPED"
        revision={revision}
      />,
    );

    expect(screen.getByRole("button", { name: "Mở lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xóa vĩnh viễn" })).toBeTruthy();
  });

  it("runs the Start action and refreshes without leaving the page", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "success",
      project: {},
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="NOT_STARTED"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));

    await waitFor(() =>
      expect(changeProjectLifecycle).toHaveBeenCalledWith({
        id: projectId,
        expectedRevision: revision,
        action: "start",
      }),
    );

    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(`Đã bắt đầu "${title}"`);
  });

  it("offers to reload when the revision is stale", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "error",
      message: "Conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeTruthy();

    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows the server message for an invalid transition without a reload action", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "error",
      message: "Cannot pause a Project in state PAUSED",
      code: "INVALID_PROJECT_TRANSITION",
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));

    expect(
      await screen.findByText("Cannot pause a Project in state PAUSED"),
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", { name: "Tải bản mới nhất" }),
    ).toBeNull();
  });

  it("keeps local state and shows a generic message when the request throws", async () => {
    changeProjectLifecycle.mockRejectedValue(new Error("network down"));

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="NOT_STARTED"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));

    expect(
      await screen.findByText("Không thể cập nhật Project. Vui lòng thử lại."),
    ).toBeTruthy();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("requires confirmation before permanently deleting a Project", async () => {
    // deleteProjectPermanently không bao giờ "return" khi thành công — Server
    // Action tự redirect() trên server, Next.js hiện thực điều đó bằng cách
    // throw một lỗi có digest NEXT_REDIRECT. Mock đúng hành vi thật thay vì
    // một status:"success" không có thật trong runtime — xem giải thích chi
    // tiết ở memory-lifecycle-controls.test.tsx (cùng pattern).
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

    deleteProjectPermanently.mockRejectedValue(redirectError("/projects"));

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="NOT_STARTED"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xóa vĩnh viễn" }));

    expect(deleteProjectPermanently).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog).getByRole("heading", {
        name: "Xóa vĩnh viễn Project này?",
      }),
    ).toBeTruthy();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }),
    );

    await waitFor(() =>
      expect(deleteProjectPermanently).toHaveBeenCalledWith({
        id: projectId,
        expectedRevision: revision,
      }),
    );

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(`Đã xóa vĩnh viễn "${title}"`),
    );
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    await redirectRejection;
  });

  it("shows a dedicated message when the server rejects deletion", async () => {
    deleteProjectPermanently.mockResolvedValue({
      status: "error",
      message: "generic conflict message",
      code: "PROJECT_DELETION_NOT_ALLOWED",
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="STOPPED"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xóa vĩnh viễn" }));

    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }),
    );

    expect(
      await within(dialog).findByText(
        "Project đã từng có Project Cycle nên không thể xóa vĩnh viễn.",
      ),
    ).toBeTruthy();

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
