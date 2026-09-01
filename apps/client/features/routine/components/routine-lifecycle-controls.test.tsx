// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { changeRoutineState, push, refresh } = vi.hoisted(() => ({
  changeRoutineState: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

vi.mock("@/features/routine/actions/routine", () => ({
  changeRoutineState,
}));

import { RoutineLifecycleControls } from "./routine-lifecycle-controls";

const routineId = "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676";
const title = "Morning ritual";
const revision = 3;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RoutineLifecycleControls", () => {
  it("archives an active Routine", async () => {
    changeRoutineState.mockResolvedValue({ status: "success", routine: {} });

    render(
      <RoutineLifecycleControls
        id={routineId}
        title={title}
        isActive={true}
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));

    await vi.waitFor(() =>
      expect(changeRoutineState).toHaveBeenCalledWith({
        id: routineId,
        expectedRevision: revision,
        action: "archive",
      }),
    );

    // Lưu trữ không rời trang — chỉ refresh để re-render đúng state tại chỗ.
    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("restores an archived Routine", async () => {
    changeRoutineState.mockResolvedValue({ status: "success", routine: {} });

    render(
      <RoutineLifecycleControls
        id={routineId}
        title={title}
        isActive={false}
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục" }));

    await vi.waitFor(() =>
      expect(changeRoutineState).toHaveBeenCalledWith({
        id: routineId,
        expectedRevision: revision,
        action: "restore",
      }),
    );

    expect(push).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("offers to reload when the revision is stale", async () => {
    changeRoutineState.mockResolvedValue({
      status: "error",
      message: "Conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });

    render(
      <RoutineLifecycleControls
        id={routineId}
        title={title}
        isActive={true}
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));

    expect(
      await screen.findByText(
        "Trình tự đã thay đổi ở một phiên làm việc khác.",
      ),
    ).toBeTruthy();

    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows the server message for a non-conflict error without a reload action", async () => {
    changeRoutineState.mockResolvedValue({
      status: "error",
      message: "Không thể lưu trữ trình tự đang hoạt động trong Routine.",
      code: "ROUTINE_HAS_ACTIVE_HABITS",
    });

    render(
      <RoutineLifecycleControls
        id={routineId}
        title={title}
        isActive={true}
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));

    expect(
      await screen.findByText(
        "Không thể lưu trữ trình tự đang hoạt động trong Routine.",
      ),
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", { name: "Tải bản mới nhất" }),
    ).toBeNull();
  });

  it("keeps local state and shows a generic message when the request throws", async () => {
    changeRoutineState.mockRejectedValue(new Error("network down"));

    render(
      <RoutineLifecycleControls
        id={routineId}
        title={title}
        isActive={true}
        revision={revision}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));

    expect(
      await screen.findByText("Không thể cập nhật trình tự. Vui lòng thử lại."),
    ).toBeTruthy();

    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
