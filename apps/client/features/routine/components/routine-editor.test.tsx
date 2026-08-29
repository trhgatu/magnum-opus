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

const { createRoutine, updateRoutineTitle, push, refresh } = vi.hoisted(() => ({
  createRoutine: vi.fn(),
  updateRoutineTitle: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/routine/actions/routine", () => ({
  createRoutine,
  updateRoutineTitle,
}));

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

    fireEvent.change(screen.getByLabelText("Tên Trình tự"), {
      target: { value: "Morning ritual" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Tạo Trình tự" }).closest("form")!,
    );

    await waitFor(() =>
      expect(createRoutine).toHaveBeenCalledWith({ title: "Morning ritual" }),
    );
    expect(push).toHaveBeenCalledWith(`/routines/${routine.id}`);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("updates the title at the current revision", async () => {
    updateRoutineTitle.mockResolvedValue({ status: "success", routine });
    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.change(screen.getByLabelText("Tên Trình tự"), {
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
  });

  it("keeps the editor open after a revision conflict", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "error",
      message: "Conflict",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });
    render(<RoutineEditor initialRoutine={routine} />);

    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    expect(
      await screen.findByText(
        "Trình tự đã thay đổi ở nơi khác. Tải lại trang trước khi lưu tiếp.",
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
