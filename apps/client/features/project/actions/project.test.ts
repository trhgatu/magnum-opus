import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, redirect, revalidatePath } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));
vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return {
    ...actual,
    apiFetch,
  };
});

import { ApiError } from "@/lib/api";
import {
  changeProjectLifecycle,
  createProject,
  deleteProjectPermanently,
  setProjectIntendedOutcome,
  setProjectTargetEndDate,
  updateProject,
} from "./project";

const project = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Xây dựng Crucible V1",
  description: "Effort trọng tâm của quý này",
  lifecycleState: "NOT_STARTED" as const,
  currentCycle: null,
  revision: 1,
  createdAt: "2026-08-28T06:00:00.000Z",
  updatedAt: "2026-08-28T06:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Project Server Actions", () => {
  it("creates a Project with a normalized title and description", async () => {
    apiFetch.mockResolvedValue(project);

    await expect(
      createProject({
        title: "  Xây dựng Crucible V1  ",
        description: "  Effort trọng tâm của quý này  ",
      }),
    ).resolves.toEqual({
      status: "success",
      project,
    });

    expect(apiFetch).toHaveBeenCalledWith("/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "Xây dựng Crucible V1",
        description: "Effort trọng tâm của quý này",
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/projects");
  });

  it("normalizes a blank description to null", async () => {
    apiFetch.mockResolvedValue(project);

    await createProject({ title: "Xây dựng Crucible V1", description: "   " });

    expect(apiFetch).toHaveBeenCalledWith("/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "Xây dựng Crucible V1",
        description: null,
      }),
    });
  });

  it("rejects an invalid title before contacting the API", async () => {
    await expect(
      createProject({
        title: "   ",
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Tiêu đề Project không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("updates a Project's title and description at the expected revision", async () => {
    const updatedProject = {
      ...project,
      title: "Xây dựng Crucible V2",
      revision: 2,
    };

    apiFetch.mockResolvedValue(updatedProject);

    await expect(
      updateProject({
        id: project.id,
        title: "  Xây dựng Crucible V2  ",
        description: project.description,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      project: updatedProject,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Xây dựng Crucible V2",
        description: project.description,
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/projects");
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`);
  });

  it("rejects an invalid update before contacting the API", async () => {
    await expect(
      updateProject({
        id: project.id,
        title: "Xây dựng Crucible V2",
        expectedRevision: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preserves a revision conflict returned by the backend", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "PROJECT_REVISION_CONFLICT",
        message: "Project đã thay đổi ở một phiên làm việc khác.",
      }),
    );

    await expect(
      updateProject({
        id: project.id,
        title: "Xây dựng Crucible V2",
        expectedRevision: project.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["start", "pause", "resume", "stop", "complete", "reopen"] as const)(
    "runs the %s lifecycle action",
    async (action) => {
      const transitioned = { ...project, revision: 2 };
      apiFetch.mockResolvedValue(transitioned);

      await expect(
        changeProjectLifecycle({
          id: project.id,
          action,
          expectedRevision: 1,
        }),
      ).resolves.toEqual({
        status: "success",
        project: transitioned,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        `/projects/${project.id}/${action}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: 1,
          }),
        },
      );

      expect(revalidatePath).toHaveBeenCalledWith("/projects");
      expect(revalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`);
    },
  );

  it("rejects an invalid lifecycle action at runtime", async () => {
    await expect(
      changeProjectLifecycle({
        id: project.id,
        action: "destroy" as never,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preserves an invalid-transition error code from the backend", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "INVALID_PROJECT_TRANSITION",
        message: "Cannot pause a Project in state PAUSED",
      }),
    );

    await expect(
      changeProjectLifecycle({
        id: project.id,
        action: "pause",
        expectedRevision: project.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "INVALID_PROJECT_TRANSITION",
    });
  });

  it("sets the intended outcome of the current Cycle", async () => {
    const updatedProject = {
      ...project,
      lifecycleState: "ACTIVE" as const,
      currentCycle: {
        id: "cycle-id",
        cycleNumber: 1,
        intendedOutcome: "Ship Projects V1",
        outcomeHistory: [
          { outcome: "Ship Projects V1", setAt: project.createdAt },
        ],
        targetEndAt: null,
        closingNote: null,
        startedAt: project.createdAt,
        endedAt: null,
        endReason: null,
      },
      revision: 2,
    };

    apiFetch.mockResolvedValue(updatedProject);

    await expect(
      setProjectIntendedOutcome({
        id: project.id,
        intendedOutcome: "  Ship Projects V1  ",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      project: updatedProject,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${project.id}/cycle/outcome`,
      {
        method: "PUT",
        body: JSON.stringify({
          intendedOutcome: "Ship Projects V1",
          expectedRevision: 1,
        }),
      },
    );

    expect(revalidatePath).toHaveBeenCalledWith("/projects");
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`);
  });

  it("rejects a blank intended outcome before contacting the API", async () => {
    await expect(
      setProjectIntendedOutcome({
        id: project.id,
        intendedOutcome: "   ",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Intended outcome không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  // V1.1 — ghi chú khép lại Cycle (BR-PRJ-034)
  it.each(["stop", "complete"] as const)(
    "sends a trimmed closing note with %s",
    async (action) => {
      apiFetch.mockResolvedValue({ ...project, revision: 2 });

      await changeProjectLifecycle({
        id: project.id,
        action,
        expectedRevision: 1,
        closingNote: "  Đổi hướng sang việc khác  ",
      });

      expect(apiFetch).toHaveBeenCalledWith(
        `/projects/${project.id}/${action}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedRevision: 1,
            closingNote: "Đổi hướng sang việc khác",
          }),
        },
      );
    },
  );

  it("omits a blank closing note", async () => {
    apiFetch.mockResolvedValue({ ...project, revision: 2 });

    await changeProjectLifecycle({
      id: project.id,
      action: "complete",
      expectedRevision: 1,
      closingNote: "   ",
    });

    expect(apiFetch).toHaveBeenCalledWith(`/projects/${project.id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ expectedRevision: 1 }),
    });
  });

  it("never sends a closing note with an action that does not close a Cycle", async () => {
    apiFetch.mockResolvedValue({ ...project, revision: 2 });

    await changeProjectLifecycle({
      id: project.id,
      action: "pause",
      expectedRevision: 1,
      closingNote: "Không thuộc về Pause",
    });

    expect(apiFetch).toHaveBeenCalledWith(`/projects/${project.id}/pause`, {
      method: "PATCH",
      body: JSON.stringify({ expectedRevision: 1 }),
    });
  });

  it("rejects a closing note over 2000 characters before contacting the API", async () => {
    await expect(
      changeProjectLifecycle({
        id: project.id,
        action: "stop",
        expectedRevision: 1,
        closingNote: "a".repeat(2001),
      }),
    ).resolves.toEqual({
      status: "error",
      code: "INVALID_CLOSING_NOTE",
      message: "Ghi chú khép lại tối đa 2000 ký tự.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("counts the closing note limit in characters, not UTF-16 units", async () => {
    apiFetch.mockResolvedValue({ ...project, revision: 2 });

    // 2000 emoji = 4000 UTF-16 code units, nhưng vẫn là 2000 ký tự.
    await changeProjectLifecycle({
      id: project.id,
      action: "stop",
      expectedRevision: 1,
      closingNote: "🔥".repeat(2000),
    });

    expect(apiFetch).toHaveBeenCalledOnce();
  });

  // V1.1 — ngày kết thúc dự kiến (BR-PRJ-036)
  it("sets the target end date of the current Cycle", async () => {
    apiFetch.mockResolvedValue({ ...project, revision: 3 });

    await expect(
      setProjectTargetEndDate({
        id: project.id,
        targetEndAt: "2026-10-31",
        expectedRevision: 2,
      }),
    ).resolves.toEqual({
      status: "success",
      project: { ...project, revision: 3 },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${project.id}/cycle/target-end`,
      {
        method: "PUT",
        body: JSON.stringify({
          targetEndAt: "2026-10-31",
          expectedRevision: 2,
        }),
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${project.id}`);
  });

  it("clears the target end date with an explicit null", async () => {
    apiFetch.mockResolvedValue({ ...project, revision: 4 });

    await setProjectTargetEndDate({
      id: project.id,
      targetEndAt: null,
      expectedRevision: 3,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${project.id}/cycle/target-end`,
      {
        method: "PUT",
        body: JSON.stringify({ targetEndAt: null, expectedRevision: 3 }),
      },
    );
  });

  it.each(["", "31/10/2026", "2026-10-31T00:00:00.000Z"])(
    "rejects the malformed target end date %j before contacting the API",
    async (targetEndAt) => {
      await expect(
        setProjectTargetEndDate({
          id: project.id,
          targetEndAt,
          expectedRevision: 2,
        }),
      ).resolves.toEqual({
        status: "error",
        code: "INVALID_TARGET_END_DATE",
        message: "Ngày dự kiến không hợp lệ.",
      });

      expect(apiFetch).not.toHaveBeenCalled();
    },
  );

  it("preserves the server rejection of a date that does not exist", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 400,
        code: "INVALID_TARGET_END_DATE",
        message: "Invalid target end date: 2026-02-30",
      }),
    );

    await expect(
      setProjectTargetEndDate({
        id: project.id,
        targetEndAt: "2026-02-30",
        expectedRevision: 2,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "INVALID_TARGET_END_DATE",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("permanently deletes a Project and redirects to the list", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(
      deleteProjectPermanently({
        id: project.id,
        expectedRevision: 4,
      }),
    ).resolves.toBeUndefined();

    expect(apiFetch).toHaveBeenCalledWith(
      `/projects/${project.id}?expectedRevision=4`,
      {
        method: "DELETE",
      },
    );

    expect(revalidatePath).toHaveBeenCalledWith("/projects");
    expect(redirect).toHaveBeenCalledWith("/projects");
  });

  it("preserves a deletion-not-allowed error instead of redirecting", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "PROJECT_DELETION_NOT_ALLOWED",
        message: "Project đã từng có Project Cycle nên không thể xóa.",
      }),
    );

    await expect(
      deleteProjectPermanently({
        id: project.id,
        expectedRevision: project.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "PROJECT_DELETION_NOT_ALLOWED",
    });

    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an invalid delete request before contacting the API", async () => {
    await expect(
      deleteProjectPermanently({
        id: "not-a-uuid",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
