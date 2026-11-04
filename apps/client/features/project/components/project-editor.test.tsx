// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createProject, push, refresh, notifySuccess } = vi.hoisted(() => ({
  createProject: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/project/actions/project", () => ({ createProject }));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { ProjectEditor } from "./project-editor";

const project = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Xây dựng Crucible V1",
  description: "Effort trọng tâm của quý này",
  revision: 1,
};

const submit = () =>
  fireEvent.submit(
    screen.getByRole("button", { name: "Tạo Project" }).closest("form")!,
  );

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
    submit();

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

  it("keeps what was typed and explains a failed create", async () => {
    createProject.mockResolvedValue({
      status: "error",
      message: "Tiêu đề Project không hợp lệ.",
    });
    render(<ProjectEditor />);

    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Crucible" },
    });
    submit();

    expect(
      await screen.findByText("Tiêu đề Project không hợp lệ."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tên Project")).toHaveValue("Crucible");
    expect(push).not.toHaveBeenCalled();
  });

  it("does not warn about leaving before anything is typed", async () => {
    render(<ProjectEditor />);

    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    // Hộp thoại tải lười: đợi chunk xong rồi mới khẳng định là nó không hiện.
    await act(async () => {
      await import("@/components/system/discard-dialog");
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("warns about leaving once something is typed", async () => {
    render(<ProjectEditor />);

    fireEvent.change(screen.getByLabelText("Mô tả (tùy chọn)"), {
      target: { value: "Mô tả mới" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Bỏ phần đang viết?" }),
    ).toBeTruthy();
  });
});
