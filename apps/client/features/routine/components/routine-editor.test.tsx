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
  createRoutine,
  reloadRoutine,
  updateRoutineTitle,
  push,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  createRoutine: vi.fn(),
  reloadRoutine: vi.fn(),
  updateRoutineTitle: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/routine/actions/routine", () => ({
  createRoutine,
  reloadRoutine,
  updateRoutineTitle,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { RoutineEditor } from "./routine-editor";

const routine = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Morning ritual",
  revision: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RoutineEditor", () => {
  it("creates a Routine and navigates to its detail", async () => {
    createRoutine.mockResolvedValue({ status: "success", routine });
    render(<RoutineEditor />);

    fireEvent.change(screen.getByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Morning ritual" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Tạo Nếp sinh hoạt" })
        .closest("form")!,
    );

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({ title: "Morning ritual" }),
    );
    expect(push).toHaveBeenCalledWith(`/routines/${routine.id}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(`Đã tạo "${routine.title}"`);
  });

  it("updates the title at the current revision", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "success",
      routine: { ...routine, title: "Evening ritual" },
    });
    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.change(screen.getByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Evening ritual" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    await waitFor(() =>
      expect(updateRoutineTitle).toHaveBeenCalledWith({
        id: routine.id,
        title: "Evening ritual",
        expectedRevision: routine.revision,
      }),
    );

    expect(notifySuccess).toHaveBeenCalledWith('Đã cập nhật "Evening ritual"');
  });

  it("offers to reload when the revision is stale", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "error",
      message: "Nếp sinh hoạt đã thay đổi ở một phiên làm việc khác.",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });
    reloadRoutine.mockResolvedValue({
      status: "success",
      routine: {
        ...routine,
        isActive: true,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Nếp sinh hoạt đã được thay đổi ở nơi khác",
      }),
    ).toBeInTheDocument();

    const useLatestButton = screen.getByRole("button", {
      name: "Dùng bản mới nhất",
    });

    await waitFor(() =>
      expect((useLatestButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(useLatestButton);

    await waitFor(() => expect(reloadRoutine).toHaveBeenCalledWith(routine.id));

    expect(
      (screen.getByLabelText("Tên Nếp sinh hoạt") as HTMLInputElement).value,
    ).toBe("Bản mới nhất từ server");
    expect(push).not.toHaveBeenCalled();
  });

  it("rebases preserved local content onto the latest revision", async () => {
    updateRoutineTitle
      .mockResolvedValueOnce({
        status: "error",
        message: "Nếp sinh hoạt đã thay đổi ở một phiên làm việc khác.",
        kind: "conflict",
        code: "ROUTINE_REVISION_CONFLICT",
      })
      .mockResolvedValueOnce({
        status: "success",
        routine: { ...routine, title: "Bản local được giữ lại", revision: 5 },
      });
    reloadRoutine.mockResolvedValue({
      status: "success",
      routine: {
        ...routine,
        isActive: true,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.change(screen.getByLabelText("Tên Nếp sinh hoạt"), {
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

    await waitFor(() => expect(updateRoutineTitle).toHaveBeenCalledTimes(2));

    expect(updateRoutineTitle).toHaveBeenLastCalledWith({
      id: routine.id,
      title: "Bản local được giữ lại",
      expectedRevision: 4,
    });

    expect(push).toHaveBeenCalledWith(`/routines/${routine.id}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Bản local được giữ lại"',
    );
  });

  it("keeps the draft on screen when the routine was archived elsewhere", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "error",
      message: "Nếp sinh hoạt đã thay đổi ở một phiên làm việc khác.",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });
    reloadRoutine.mockResolvedValue({
      status: "success",
      routine: { ...routine, isActive: false, revision: 4 },
    });

    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.change(screen.getByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Bản đang viết dở" },
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

    expect(
      await screen.findByText(
        "Nếp sinh hoạt đã được lưu trữ ở nơi khác. Nội dung đang viết vẫn được giữ trên màn hình để sao chép.",
      ),
    ).toBeInTheDocument();

    expect(
      (screen.getByLabelText("Tên Nếp sinh hoạt") as HTMLInputElement).value,
    ).toBe("Bản đang viết dở");
    expect(updateRoutineTitle).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("does not warn about leaving before the title is edited", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("warns about leaving once the title has unsaved changes", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.change(screen.getByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Evening ritual" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });
});
