import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, revalidatePath } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return {
    ...actual,
    apiFetch,
  };
});

import { ApiError } from "@/lib/api";
import {
  changeHabitCheckIn,
  changeHabitState,
  createHabit,
  reloadHabit,
  updateHabit,
} from "./habit";

const habit = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Thiền 10 phút",
  description: "Một hành động nhỏ để lặp lại có chủ ý.",
  frequencyType: "DAILY" as const,
  frequencyDays: [] as number[],
  isActive: true,
  revision: 1,
  createdAt: "2026-08-28T06:00:00.000Z",
  updatedAt: "2026-08-28T06:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Habit Server Actions", () => {
  it("creates a Habit with a normalized DAILY form", async () => {
    apiFetch.mockResolvedValue(habit);

    await expect(
      createHabit({
        title: "  Thiền 10 phút  ",
        description: "  Một hành động nhỏ để lặp lại có chủ ý.  ",
        frequencyType: "DAILY",
        // DAILY luôn bỏ frequencyDays bất kể input truyền gì.
        frequencyDays: [3, 5],
      }),
    ).resolves.toEqual({ status: "success", habit });

    expect(apiFetch).toHaveBeenCalledWith("/habits", {
      method: "POST",
      body: JSON.stringify({
        title: "Thiền 10 phút",
        description: "Một hành động nhỏ để lặp lại có chủ ý.",
        frequencyType: "DAILY",
        frequencyDays: [],
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/habits");
  });

  it("normalizes and sorts WEEKLY frequency days", async () => {
    apiFetch.mockResolvedValue({
      ...habit,
      frequencyType: "WEEKLY",
      frequencyDays: [1, 3, 5],
    });

    await createHabit({
      title: "Thiền",
      description: null,
      frequencyType: "WEEKLY",
      frequencyDays: [5, 1, 5, 3],
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/habits",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Thiền",
          description: null,
          frequencyType: "WEEKLY",
          frequencyDays: [1, 3, 5],
        }),
      }),
    );
  });

  it("rejects an empty title before contacting the API", async () => {
    await expect(
      createHabit({
        title: "   ",
        description: null,
        frequencyType: "DAILY",
        frequencyDays: [],
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects a WEEKLY Habit with no days selected", async () => {
    await expect(
      createHabit({
        title: "Thiền",
        description: null,
        frequencyType: "WEEKLY",
        frequencyDays: [],
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("updates a Habit at the expected revision", async () => {
    const updated = { ...habit, title: "Thiền 15 phút", revision: 2 };
    apiFetch.mockResolvedValue(updated);

    await expect(
      updateHabit({
        id: habit.id,
        title: "  Thiền 15 phút  ",
        description: habit.description,
        frequencyType: "DAILY",
        frequencyDays: [],
        expectedRevision: 1,
      }),
    ).resolves.toEqual({ status: "success", habit: updated });

    expect(apiFetch).toHaveBeenCalledWith(`/habits/${habit.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Thiền 15 phút",
        description: habit.description,
        frequencyType: "DAILY",
        frequencyDays: [],
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/habits");
    expect(revalidatePath).toHaveBeenCalledWith(`/habits/${habit.id}`);
  });

  it("rejects an invalid id before contacting the API", async () => {
    await expect(
      updateHabit({
        id: "not-a-uuid",
        title: "Thiền 15 phút",
        description: null,
        frequencyType: "DAILY",
        frequencyDays: [],
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("preserves a revision conflict returned by the backend", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "HABIT_REVISION_CONFLICT",
        message: "unsafe backend detail",
      }),
    );

    await expect(
      updateHabit({
        id: habit.id,
        title: "Thiền 15 phút",
        description: null,
        frequencyType: "DAILY",
        frequencyDays: [],
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "HABIT_REVISION_CONFLICT",
    });
  });

  it("reloads a Habit by id", async () => {
    apiFetch.mockResolvedValue(habit);

    await expect(reloadHabit(habit.id)).resolves.toEqual({
      status: "success",
      habit,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/habits/${habit.id}`);
  });

  it("rejects an invalid id when reloading", async () => {
    await expect(reloadHabit("not-a-uuid")).resolves.toEqual({
      status: "error",
      message: "Dữ liệu thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("archives an active Habit", async () => {
    const archived = { ...habit, isActive: false, revision: 2 };
    apiFetch.mockResolvedValue(archived);

    await expect(
      changeHabitState({
        id: habit.id,
        expectedRevision: 1,
        action: "archive",
      }),
    ).resolves.toEqual({ status: "success", habit: archived });

    expect(apiFetch).toHaveBeenCalledWith(`/habits/${habit.id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ expectedRevision: 1 }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/habits");
    expect(revalidatePath).toHaveBeenCalledWith(`/habits/${habit.id}`);
  });

  it("restores an archived Habit", async () => {
    apiFetch.mockResolvedValue({ ...habit, isActive: true, revision: 3 });

    await changeHabitState({
      id: habit.id,
      expectedRevision: 2,
      action: "restore",
    });

    expect(apiFetch).toHaveBeenCalledWith(`/habits/${habit.id}/restore`, {
      method: "PATCH",
      body: JSON.stringify({ expectedRevision: 2 }),
    });
  });

  it("rejects an invalid revision for lifecycle changes", async () => {
    await expect(
      changeHabitState({
        id: habit.id,
        expectedRevision: 0,
        action: "archive",
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("checks in a Habit for today", async () => {
    const today = {
      date: "2026-08-28",
      habitId: habit.id,
      checkedIn: true,
    };
    apiFetch.mockResolvedValueOnce(undefined).mockResolvedValueOnce(today);

    await expect(
      changeHabitCheckIn({ id: habit.id, action: "check-in" }),
    ).resolves.toEqual({ status: "success", today });

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      `/habits/${habit.id}/check-ins/today`,
      { method: "PUT" },
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      `/habits/${habit.id}/check-ins/today`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/habits/${habit.id}`);
  });

  it("undoes today's check-in", async () => {
    apiFetch.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
      date: "2026-08-28",
      habitId: habit.id,
      checkedIn: false,
    });

    await changeHabitCheckIn({ id: habit.id, action: "undo" });

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      `/habits/${habit.id}/check-ins/today`,
      { method: "DELETE" },
    );
  });

  it("rejects an invalid id for check-in", async () => {
    await expect(
      changeHabitCheckIn({ id: "not-a-uuid", action: "check-in" }),
    ).resolves.toEqual({
      status: "error",
      message: "Thói quen không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });
});
