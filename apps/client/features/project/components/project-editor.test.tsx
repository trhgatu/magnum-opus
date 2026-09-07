// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProject,
  reloadProject,
  updateProject,
  push,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  createProject: vi.fn(),
  reloadProject: vi.fn(),
  updateProject: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/project/actions/project", () => ({
  createProject,
  reloadProject,
  updateProject,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { ProjectEditor } from "./project-editor";

const project = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Xây dựng Crucible V1",
  description: "Effort trọng tâm của quý này",
  revision: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ProjectEditor", () => {
  it("creates a Project and navigates to its detail", async () => {
    createProject.mockResolvedValue({ status: "success", project });
    render(<ProjectEditor />);

    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Xây dựng Crucible V1" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Tạo Project" }).closest("form")!,
    );

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        title: "Xây dựng Crucible V1",
        description: "",
      }),
    );
    expect(push).toHaveBeenCalledWith(`/projects/${project.id}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(`Đã tạo "${project.title}"`);
  });

  it("updates the title and description at the current revision", async () => {
    updateProject.mockResolvedValue({
      status: "success",
      project: { ...project, title: "Xây dựng Crucible V2" },
    });
    render(<ProjectEditor initialProject={project} />);

    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Xây dựng Crucible V2" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith({
        id: project.id,
        title: "Xây dựng Crucible V2",
        description: project.description,
        expectedRevision: project.revision,
      }),
    );

    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Xây dựng Crucible V2"',
    );
  });

  it("offers to reload when the revision is stale", async () => {
    updateProject.mockResolvedValue({
      status: "error",
      message: "Project đã thay đổi ở một phiên làm việc khác.",
      kind: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });
    reloadProject.mockResolvedValue({
      status: "success",
      project: {
        ...project,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(<ProjectEditor initialProject={project} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Project đã được thay đổi ở nơi khác",
      }),
    ).toBeInTheDocument();

    const useLatestButton = screen.getByRole("button", {
      name: "Dùng bản mới nhất",
    });

    await waitFor(() =>
      expect((useLatestButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(useLatestButton);

    await waitFor(() => expect(reloadProject).toHaveBeenCalledWith(project.id));

    expect(
      (screen.getByLabelText("Tên Project") as HTMLInputElement).value,
    ).toBe("Bản mới nhất từ server");
    expect(push).not.toHaveBeenCalled();
  });

  it("rebases preserved local content onto the latest revision", async () => {
    updateProject
      .mockResolvedValueOnce({
        status: "error",
        message: "Project đã thay đổi ở một phiên làm việc khác.",
        kind: "conflict",
        code: "PROJECT_REVISION_CONFLICT",
      })
      .mockResolvedValueOnce({
        status: "success",
        project: { ...project, title: "Bản local được giữ lại", revision: 5 },
      });
    reloadProject.mockResolvedValue({
      status: "success",
      project: {
        ...project,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(<ProjectEditor initialProject={project} />);

    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Bản local được giữ lại" },
    });

    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    const keepLocalButton = await screen.findByRole("button", {
      name: "Ghi nội dung đang viết",
    });

    await waitFor(() =>
      expect((keepLocalButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(keepLocalButton);

    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(2));

    expect(updateProject).toHaveBeenLastCalledWith({
      id: project.id,
      title: "Bản local được giữ lại",
      description: project.description,
      expectedRevision: 4,
    });

    expect(push).toHaveBeenCalledWith(`/projects/${project.id}`);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("stays editable even when the latest revision has moved to a closed state", async () => {
    // Khác Routine (khóa form khi bản mới nhất bị archive) — Project luôn
    // cho phép sửa title/description bất kể lifecycle state (BR-PRJ-002),
    // nên "dùng bản mới nhất" không tạo ra trạng thái read-only nào.
    updateProject.mockResolvedValue({
      status: "error",
      message: "Project đã thay đổi ở một phiên làm việc khác.",
      kind: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });
    reloadProject.mockResolvedValue({
      status: "success",
      project: { ...project, title: "Bản mới nhất từ server", revision: 4 },
    });

    render(<ProjectEditor initialProject={project} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    const useLatestButton = await screen.findByRole("button", {
      name: "Dùng bản mới nhất",
    });

    await waitFor(() =>
      expect((useLatestButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(useLatestButton);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Tên Project") as HTMLInputElement).disabled,
      ).toBe(false),
    );
  });

  it("does not warn about leaving before anything is edited", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectEditor initialProject={project} />);

    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("warns about leaving once the description has unsaved changes", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProjectEditor initialProject={project} />);

    fireEvent.change(screen.getByLabelText("Mô tả (tùy chọn)"), {
      target: { value: "Mô tả mới" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });
});
