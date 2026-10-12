// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

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

import { listenForNextRedirect } from "@/test/next-redirect";

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

  it("requires confirmation before completing a Project", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "success",
      project: {},
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));

    expect(changeProjectLifecycle).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog).getByRole("heading", {
        name: "Đánh dấu Project này đã hoàn thành?",
      }),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Hoàn thành" }));

    await waitFor(() =>
      expect(changeProjectLifecycle).toHaveBeenCalledWith({
        id: projectId,
        expectedRevision: revision,
        action: "complete",
      }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(`Đã hoàn thành "${title}"`);
  });

  it("requires confirmation before stopping a Project", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "success",
      project: {},
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dừng lại" }));

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog).getByRole("heading", {
        name: "Dừng Project này lại?",
      }),
    ).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Dừng lại" }));

    await waitFor(() =>
      expect(changeProjectLifecycle).toHaveBeenCalledWith({
        id: projectId,
        expectedRevision: revision,
        action: "stop",
      }),
    );

    expect(notifySuccess).toHaveBeenCalledWith(`Đã dừng "${title}"`);
  });

  // V1.1 — ghi chú khép lại Cycle (BR-PRJ-034)
  it.each([
    ["ACTIVE", "Dừng lại", "stop"],
    ["PAUSED", "Hoàn thành", "complete"],
  ] as const)(
    "sends an optional closing note when a %s Project is closed with %s",
    async (lifecycleState, label, action) => {
      changeProjectLifecycle.mockResolvedValue({
        status: "success",
        project: {},
      });

      render(
        <ProjectLifecycleControls
          id={projectId}
          title={title}
          lifecycleState={lifecycleState}
          revision={revision}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: label }));
      const dialog = await screen.findByRole("alertdialog");

      fireEvent.change(
        within(dialog).getByLabelText("Ghi chú khép lại (không bắt buộc)"),
        { target: { value: "Đổi hướng sang việc khác" } },
      );
      fireEvent.click(within(dialog).getByRole("button", { name: label }));

      await waitFor(() =>
        expect(changeProjectLifecycle).toHaveBeenCalledWith({
          id: projectId,
          expectedRevision: revision,
          action,
          closingNote: "Đổi hướng sang việc khác",
        }),
      );
    },
  );

  it("offers no closing note when stopping a Project that never started", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Dừng lại" }));
    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog).queryByLabelText("Ghi chú khép lại (không bắt buộc)"),
    ).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Dừng lại" }));

    await waitFor(() => expect(changeProjectLifecycle).toHaveBeenCalledOnce());
    expect(changeProjectLifecycle.mock.calls[0][0]).not.toHaveProperty(
      "closingNote",
    );
  });

  it("discards the closing note draft when the confirmation is cancelled", async () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));
    let dialog = await screen.findByRole("alertdialog");
    fireEvent.change(
      within(dialog).getByLabelText("Ghi chú khép lại (không bắt buộc)"),
      { target: { value: "Bản nháp" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Dừng lại" }));
    dialog = await screen.findByRole("alertdialog");

    expect(
      (
        within(dialog).getByLabelText(
          "Ghi chú khép lại (không bắt buộc)",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");
  });

  it("counts the closing note in characters and blocks confirming past 2000", async () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dừng lại" }));
    const dialog = await screen.findByRole("alertdialog");
    const note = within(dialog).getByLabelText(
      "Ghi chú khép lại (không bắt buộc)",
    ) as HTMLTextAreaElement;
    const confirm = within(dialog).getByRole("button", {
      name: "Dừng lại",
    }) as HTMLButtonElement;

    // 2000 emoji = 4000 UTF-16 code units, nhưng vẫn đúng giới hạn.
    fireEvent.change(note, { target: { value: "🔥".repeat(2000) } });
    expect(within(dialog).getByText("2000/2000")).toBeTruthy();
    expect(confirm.disabled).toBe(false);
    expect(within(dialog).queryByRole("alert")).toBeNull();

    fireEvent.change(note, { target: { value: "a".repeat(2001) } });
    expect(within(dialog).getByText("2001/2000")).toBeTruthy();
    expect(note.getAttribute("aria-invalid")).toBe("true");
    expect(confirm.disabled).toBe(true);
    expect(within(dialog).getByRole("alert").textContent).toBe(
      "Ghi chú dài quá 2000 ký tự — rút gọn để xác nhận.",
    );

    fireEvent.click(confirm);
    expect(changeProjectLifecycle).not.toHaveBeenCalled();
    // Không cắt bớt chữ đã gõ — người dùng tự rút gọn.
    expect(note.value).toHaveLength(2001);
  });

  it("keeps the closing note and the dialog open when the server rejects it", async () => {
    changeProjectLifecycle.mockResolvedValue({
      status: "error",
      code: "INVALID_CLOSING_NOTE",
      message: "Ghi chú khép lại không hợp lệ.",
    });

    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dừng lại" }));
    const dialog = await screen.findByRole("alertdialog");
    const note = within(dialog).getByLabelText(
      "Ghi chú khép lại (không bắt buộc)",
    ) as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "Đổi hướng" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Dừng lại" }));

    expect(
      await within(dialog).findByText("Ghi chú khép lại không hợp lệ."),
    ).toBeTruthy();
    expect(note.value).toBe("Đổi hướng");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not require confirmation for low-risk actions like Start", () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="NOT_STARTED"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(changeProjectLifecycle).toHaveBeenCalledWith({
      id: projectId,
      expectedRevision: revision,
      action: "start",
    });
  });

  it("cancels a pending confirmation without calling the action", async () => {
    render(
      <ProjectLifecycleControls
        id={projectId}
        title={title}
        lifecycleState="ACTIVE"
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));

    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(changeProjectLifecycle).not.toHaveBeenCalled();
  });

  it("keeps the confirmation dialog open and shows the error when completing fails", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));

    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Hoàn thành" }));

    expect(
      await within(dialog).findByText(
        "Project đã thay đổi ở một phiên làm việc khác.",
      ),
    ).toBeTruthy();

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("requires confirmation before permanently deleting a Project", async () => {
    // deleteProjectPermanently không bao giờ "return" khi thành công — Server
    // Action tự redirect() trên server, Next.js hiện thực điều đó bằng cách
    // throw một lỗi có digest NEXT_REDIRECT. Mock đúng hành vi thật thay vì
    // một status:"success" không có thật trong runtime — xem
    // test/next-redirect.ts về cách bắt nó trong môi trường test.
    const redirect = listenForNextRedirect();
    onTestFinished(() => redirect.dispose());

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

    await redirect.waitForRedirect();
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
