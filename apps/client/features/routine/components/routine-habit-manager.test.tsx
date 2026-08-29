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

const { addRoutineHabit, moveRoutineHabit, removeRoutineHabit, refresh } =
  vi.hoisted(() => ({
    addRoutineHabit: vi.fn(),
    moveRoutineHabit: vi.fn(),
    removeRoutineHabit: vi.fn(),
    refresh: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/features/routine/actions/routine", () => ({
  addRoutineHabit,
  moveRoutineHabit,
  removeRoutineHabit,
}));

vi.mock("@/features/routine/components/routine-habit-picker", () => ({
  RoutineHabitPicker: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      aria-label="Chọn Thói quen đang hoạt động"
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Chọn Thói quen đang hoạt động</option>
      <option value="a64413f3-1487-4500-8753-0795c3f973af">Meditate</option>
    </select>
  ),
}));

import { RoutineHabitManager } from "./routine-habit-manager";

const selectableHabitId = "a64413f3-1487-4500-8753-0795c3f973af";

const routine = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Morning ritual",
  habits: [
    {
      id: "8fb923b8-5fb1-4de5-8974-b22118ee210a",
      title: "Drink water",
      isActive: true,
      order: 0,
    },
    {
      id: "433cf1f4-b70d-4b32-893b-ad1931d9b23f",
      title: "Stretch",
      isActive: true,
      order: 1,
    },
  ],
  isActive: true,
  revision: 3,
  createdAt: "2026-08-28T06:00:00.000Z",
  updatedAt: "2026-08-28T06:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("RoutineHabitManager", () => {
  it("adds a selected active Habit", async () => {
    addRoutineHabit.mockResolvedValue({ status: "success", routine: {} });
    render(<RoutineHabitManager routine={routine} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: selectableHabitId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm vào Trình tự" }));

    await waitFor(() =>
      expect(addRoutineHabit).toHaveBeenCalledWith({
        routineId: routine.id,
        habitId: selectableHabitId,
        expectedRevision: routine.revision,
      }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("moves and removes existing Habit memberships", async () => {
    moveRoutineHabit.mockResolvedValue({ status: "success", routine: {} });
    removeRoutineHabit.mockResolvedValue({ status: "success", routine: {} });
    render(<RoutineHabitManager routine={routine} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Di chuyển Drink water xuống" }),
    );
    await waitFor(() =>
      expect(moveRoutineHabit).toHaveBeenCalledWith({
        routineId: routine.id,
        habitId: routine.habits[0].id,
        direction: "down",
        expectedRevision: routine.revision,
      }),
    );

    const removeButton = screen.getByRole("button", {
      name: "Gỡ Stretch khỏi Trình tự",
    });
    await waitFor(() => expect(removeButton).not.toBeDisabled());

    fireEvent.click(removeButton);
    await waitFor(() =>
      expect(removeRoutineHabit).toHaveBeenCalledWith({
        routineId: routine.id,
        habitId: routine.habits[1].id,
        expectedRevision: routine.revision,
      }),
    );
  });

  it("does not expose membership mutations for an archived Routine", () => {
    render(<RoutineHabitManager routine={{ ...routine, isActive: false }} />);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Gỡ .* khỏi Trình tự/ }),
    ).toBeNull();
  });

  it("shows an explicit message for a stale revision", async () => {
    moveRoutineHabit.mockResolvedValue({
      status: "error",
      message: "Conflict",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });
    render(<RoutineHabitManager routine={routine} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Di chuyển Drink water xuống" }),
    );

    expect(
      await screen.findByText(
        "Trình tự đã thay đổi. Tải lại bản mới nhất trước khi tiếp tục.",
      ),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
