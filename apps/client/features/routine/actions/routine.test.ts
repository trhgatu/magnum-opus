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
  addRoutineHabit,
  changeRoutineState,
  createRoutine,
  moveRoutineHabit,
  reloadRoutine,
  removeRoutineHabit,
  updateRoutineTitle,
} from "./routine";

const routine = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Morning ritual",
  habitIds: [
    "8fb923b8-5fb1-4de5-8974-b22118ee210a",
    "433cf1f4-b70d-4b32-893b-ad1931d9b23f",
  ],
  isActive: true,
  revision: 1,
  createdAt: "2026-08-28T06:00:00.000Z",
  updatedAt: "2026-08-28T06:00:00.000Z",
};

const habitId = "8fb923b8-5fb1-4de5-8974-b22118ee210a";

const newHabitId = "a64413f3-1487-4500-8753-0795c3f973af";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Routine Server Actions", () => {
  it("creates a Routine with a normalized title", async () => {
    apiFetch.mockResolvedValue(routine);

    await expect(
      createRoutine({
        title: "  Morning ritual  ",
      }),
    ).resolves.toEqual({
      status: "success",
      routine,
    });

    expect(apiFetch).toHaveBeenCalledWith("/routines", {
      method: "POST",
      body: JSON.stringify({
        title: "Morning ritual",
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/routines");
  });

  it("rejects an invalid title before contacting the API", async () => {
    await expect(
      createRoutine({
        title: "   ",
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Tiêu đề Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("updates a Routine title at the expected revision", async () => {
    const updatedRoutine = {
      ...routine,
      title: "Evening ritual",
      revision: 2,
    };

    apiFetch.mockResolvedValue(updatedRoutine);

    await expect(
      updateRoutineTitle({
        id: routine.id,
        title: "  Evening ritual  ",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      routine: updatedRoutine,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/routines/${routine.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Evening ritual",
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${routine.id}`);
  });

  it("rejects an invalid update before contacting the API", async () => {
    await expect(
      updateRoutineTitle({
        id: routine.id,
        title: "Evening ritual",
        expectedRevision: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reloads a Routine by id", async () => {
    const routineDetail = {
      id: routine.id,
      title: routine.title,
      habits: [{ id: habitId, title: "Meditate", isActive: true, order: 0 }],
      isActive: routine.isActive,
      revision: routine.revision,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };

    apiFetch.mockResolvedValue(routineDetail);

    await expect(reloadRoutine(routine.id)).resolves.toEqual({
      status: "success",
      routine: routineDetail,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/routines/${routine.id}`);
  });

  it("rejects an invalid id when reloading a Routine", async () => {
    await expect(reloadRoutine("not-a-uuid")).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("preserves a revision conflict returned by the backend", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "ROUTINE_REVISION_CONFLICT",
        message: "Routine đã thay đổi ở một phiên làm việc khác.",
      }),
    );

    await expect(
      updateRoutineTitle({
        id: routine.id,
        title: "Evening ritual",
        expectedRevision: routine.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["archive", false],
    ["restore", true],
  ] as const)(
    "changes the Routine state through %s",
    async (action, isActive) => {
      const changedRoutine = {
        ...routine,
        isActive,
        revision: 2,
      };

      apiFetch.mockResolvedValue(changedRoutine);

      await expect(
        changeRoutineState({
          id: routine.id,
          action,
          expectedRevision: 1,
        }),
      ).resolves.toEqual({
        status: "success",
        routine: changedRoutine,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        `/routines/${routine.id}/${action}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: 1,
          }),
        },
      );

      expect(revalidatePath).toHaveBeenCalledWith("/routines");
      expect(revalidatePath).toHaveBeenCalledWith(`/routines/${routine.id}`);
    },
  );

  it("rejects an invalid lifecycle mutation", async () => {
    await expect(
      changeRoutineState({
        id: "not-a-routine-id",
        action: "archive",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("adds a Habit to a Routine at the expected revision", async () => {
    const updatedRoutine = {
      ...routine,
      habitIds: [...routine.habitIds, newHabitId],
      revision: 2,
    };

    apiFetch.mockResolvedValue(updatedRoutine);

    await expect(
      addRoutineHabit({
        routineId: routine.id,
        habitId: newHabitId,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      routine: updatedRoutine,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/routines/${routine.id}/habits`, {
      method: "POST",
      body: JSON.stringify({
        habitId: newHabitId,
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${routine.id}`);
  });

  it("removes a Habit using the expected revision query", async () => {
    const updatedRoutine = {
      ...routine,
      habitIds: routine.habitIds.filter((id) => id !== habitId),
      revision: 2,
    };

    apiFetch.mockResolvedValue(updatedRoutine);

    await expect(
      removeRoutineHabit({
        routineId: routine.id,
        habitId,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      routine: updatedRoutine,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `/routines/${routine.id}/habits/${habitId}?expectedRevision=1`,
      {
        method: "DELETE",
      },
    );

    expect(revalidatePath).toHaveBeenCalledWith("/routines");
    expect(revalidatePath).toHaveBeenCalledWith(`/routines/${routine.id}`);
  });

  it.each(["up", "down"] as const)(
    "moves a Routine Habit %s",
    async (direction) => {
      const reorderedRoutine = {
        ...routine,
        habitIds: [...routine.habitIds].reverse(),
        revision: 2,
      };

      apiFetch.mockResolvedValue(reorderedRoutine);

      await expect(
        moveRoutineHabit({
          routineId: routine.id,
          habitId,
          direction,
          expectedRevision: 1,
        }),
      ).resolves.toEqual({
        status: "success",
        routine: reorderedRoutine,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        `/routines/${routine.id}/habits/${habitId}/${direction}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: 1,
          }),
        },
      );

      expect(revalidatePath).toHaveBeenCalledWith("/routines");
      expect(revalidatePath).toHaveBeenCalledWith(`/routines/${routine.id}`);
    },
  );

  it("rejects invalid membership identifiers", async () => {
    await expect(
      addRoutineHabit({
        routineId: "not-a-routine-id",
        habitId,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Thói quen của Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an invalid move direction at runtime", async () => {
    await expect(
      moveRoutineHabit({
        routineId: routine.id,
        habitId,
        direction: "sideways" as never,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Thói quen của Trình tự không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["ROUTINE_HABIT_ALREADY_EXISTS", "ROUTINE_HABIT_INACTIVE"] as const)(
    "preserves the backend error code %s",
    async (code) => {
      apiFetch.mockRejectedValue(
        new ApiError({
          kind: "conflict",
          status: 409,
          code,
          message: "Không thể thêm Habit vào Routine.",
        }),
      );

      await expect(
        addRoutineHabit({
          routineId: routine.id,
          habitId,
          expectedRevision: routine.revision,
        }),
      ).resolves.toMatchObject({
        status: "error",
        kind: "conflict",
        code,
      });

      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid lifecycle action at runtime", async () => {
    await expect(
      changeRoutineState({
        id: routine.id,
        action: "destroy" as never,
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({ status: "error" });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid Habit ID when removing membership", async () => {
    await expect(
      removeRoutineHabit({
        routineId: routine.id,
        habitId: "not-a-habit-id",
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({ status: "error" });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
