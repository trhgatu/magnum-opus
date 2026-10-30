// @vitest-environment jsdom

import type { HabitResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateHabit, changeHabitState, refresh, notifySuccess } = vi.hoisted(
  () => ({
    updateHabit: vi.fn(),
    changeHabitState: vi.fn(),
    refresh: vi.fn(),
    notifySuccess: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

vi.mock("@/features/habit/actions/habit", () => ({
  createHabit: vi.fn(),
  reloadHabit: vi.fn(),
  updateHabit,
  changeHabitState,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import {
  HabitDetailActions,
  HabitEditableDescription,
  HabitEditableTitle,
  HabitEditProvider,
} from "./habit-edit-sheet";

const habit: HabitResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Thiền 10 phút",
  description: null,
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  isActive: true,
  revision: 3,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

const renderDetail = (initialHabit = habit) =>
  render(
    <HabitEditProvider initialHabit={initialHabit}>
      <h1>
        <HabitEditableTitle />
      </h1>
      <p>
        <HabitEditableDescription placeholder="Một hành động nhỏ." />
      </p>
      <HabitDetailActions />
    </HabitEditProvider>,
  );

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("HabitEditProvider", () => {
  it("opens the form from the Edit button with the cursor in the title", () => {
    renderDetail();

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));

    screen.getByRole("dialog", { name: "Chỉnh sửa thói quen" });
    expect(document.activeElement).toBe(screen.getByLabelText("Tên thói quen"));
  });

  it("opens the form at the description when the description is clicked", () => {
    renderDetail();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Một hành động nhỏ. Bấm để thêm mô tả.",
      }),
    );

    expect(document.activeElement).toBe(screen.getByLabelText("Ý nghĩa"));
  });

  it("closes after saving, shows the new title and archives the new revision", async () => {
    const saved = { ...habit, title: "Thiền 15 phút", revision: 4 };
    updateHabit.mockResolvedValue({ status: "success", habit: saved });
    changeHabitState.mockResolvedValue({
      status: "success",
      habit: { ...saved, isActive: false, revision: 5 },
    });
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 15 phút" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("heading").textContent).toBe("Thiền 15 phút");
    expect(refresh).toHaveBeenCalledOnce();

    // Chưa kịp refresh mà bấm Lưu trữ ngay vẫn phải dùng revision vừa lưu.
    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    await waitFor(() =>
      expect(changeHabitState).toHaveBeenCalledWith({
        id: habit.id,
        expectedRevision: 4,
        action: "archive",
      }),
    );
  });

  it("asks before throwing away unsaved changes", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 20 phút" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    screen.getByRole("dialog");

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("closes without asking when nothing changed", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("offers no editing for an archived habit", () => {
    renderDetail({ ...habit, isActive: false });

    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
    expect(screen.getByRole("heading").textContent).toBe("Thiền 10 phút");
    expect(screen.getByText("Một hành động nhỏ.")).toBeTruthy();
    screen.getByRole("button", { name: "Khôi phục" });
  });
});
