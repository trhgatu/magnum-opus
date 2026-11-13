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

const { changeHabitState, deleteHabitPermanently, refresh, notifySuccess } =
  vi.hoisted(() => ({
    changeHabitState: vi.fn(),
    deleteHabitPermanently: vi.fn(),
    refresh: vi.fn(),
    notifySuccess: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitState,
  deleteHabitPermanently,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { HabitTrashList } from "./habit-trash-list";

const habit = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Tạo nhầm",
  description: null,
  type: "BUILD" as const,
  frequencyType: "DAILY" as const,
  frequencyDays: [] as number[],
  quitStartedAt: null,
  state: "TRASHED" as const,
  revision: 4,
  createdAt: "2026-11-01T06:00:00.000Z",
  updatedAt: "2026-11-13T06:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("HabitTrashList", () => {
  it("restores a Habit from Trash with its revision", async () => {
    changeHabitState.mockResolvedValue({
      status: "success",
      habit: { ...habit, state: "ACTIVE", revision: 5 },
    });
    render(<HabitTrashList habits={[habit]} />);

    fireEvent.click(
      screen.getByRole("button", { name: 'Khôi phục "Tạo nhầm"' }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(changeHabitState).toHaveBeenCalledWith({
      id: habit.id,
      expectedRevision: 4,
      action: "untrash",
    });
    expect(notifySuccess).toHaveBeenCalledWith('Đã khôi phục "Tạo nhầm"');
  });

  it("deletes permanently only after confirming", async () => {
    deleteHabitPermanently.mockResolvedValue({ status: "success" });
    render(<HabitTrashList habits={[habit]} />);

    fireEvent.click(
      screen.getByRole("button", { name: 'Xóa vĩnh viễn "Tạo nhầm"' }),
    );
    expect(deleteHabitPermanently).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(deleteHabitPermanently).toHaveBeenCalledWith({
      id: habit.id,
      expectedRevision: 4,
    });
    expect(notifySuccess).toHaveBeenCalledWith('Đã xóa vĩnh viễn "Tạo nhầm"');
  });

  it("keeps the dialog open and offers a reload on a revision conflict", async () => {
    deleteHabitPermanently.mockResolvedValue({
      status: "error",
      code: "HABIT_REVISION_CONFLICT",
      message: "conflict",
    });
    render(<HabitTrashList habits={[habit]} />);

    fireEvent.click(
      screen.getByRole("button", { name: 'Xóa vĩnh viễn "Tạo nhầm"' }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }),
    );

    expect(
      await within(dialog).findByText(
        "Thói quen đã thay đổi ở một phiên làm việc khác.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Tải bản mới nhất" }),
    );
    expect(refresh).toHaveBeenCalled();
  });
});
