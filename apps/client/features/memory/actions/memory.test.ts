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
  changeMemoryState,
  createMemory,
  deleteMemoryPermanently,
  reloadMemory,
  updateMemory,
} from "./memory";

const memory = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  sourceJournalEntryId: null,
  title: "Buổi chiều bên cửa sổ",
  content: "Ánh nắng nằm yên trên mặt bàn.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH" as const,
  state: "ACTIVE" as const,
  revision: 1,
  trashedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Memory Server Actions", () => {
  it("creates a normalized Memory", async () => {
    apiFetch.mockResolvedValue(memory);

    await expect(
      createMemory({
        sourceJournalEntryId: null,
        title: "  Buổi chiều bên cửa sổ  ",
        content: "  Ánh nắng nằm yên trên mặt bàn.  ",
        occurredOn: "2024-08-01",
        occurredOnPrecision: "MONTH",
      }),
    ).resolves.toEqual({
      status: "success",
      memory,
    });

    expect(apiFetch).toHaveBeenCalledWith("/memories", {
      method: "POST",
      body: JSON.stringify({
        sourceJournalEntryId: null,
        title: "Buổi chiều bên cửa sổ",
        content: "Ánh nắng nằm yên trên mặt bàn.",
        occurredOn: "2024-08-01",
        occurredOnPrecision: "MONTH",
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/memories");
  });

  it("creates a Memory with unknown occurrence time", async () => {
    apiFetch.mockResolvedValue({
      ...memory,
      occurredOn: null,
      occurredOnPrecision: "UNKNOWN",
    });

    await createMemory({
      sourceJournalEntryId: null,
      title: "Một khoảnh khắc chưa rõ ngày",
      content: "Thời điểm không còn được nhớ chính xác.",
      occurredOn: null,
      occurredOnPrecision: "UNKNOWN",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/memories",
      expect.objectContaining({
        body: JSON.stringify({
          sourceJournalEntryId: null,
          title: "Một khoảnh khắc chưa rõ ngày",
          content: "Thời điểm không còn được nhớ chính xác.",
          occurredOn: null,
          occurredOnPrecision: "UNKNOWN",
        }),
      }),
    );
  });

  it("rejects invalid input before contacting the API", async () => {
    await expect(
      createMemory({
        sourceJournalEntryId: null,
        title: "   ",
        content: "Content",
        occurredOn: null,
        occurredOnPrecision: "UNKNOWN",
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preserves a safe backend error code", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 400,
        code: "MEMORY_SOURCE_JOURNAL_NOT_FOUND",
        message: "Dữ liệu gửi lên không hợp lệ.",
      }),
    );

    await expect(
      createMemory({
        sourceJournalEntryId: "cc2a5d7a-72ba-41ce-9ad8-c82941270f35",
        title: "Một ký ức",
        content: "Nội dung độc lập.",
        occurredOn: null,
        occurredOnPrecision: "UNKNOWN",
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "validation",
      code: "MEMORY_SOURCE_JOURNAL_NOT_FOUND",
    });
  });

  it("updates a Memory at the expected revision", async () => {
    apiFetch.mockResolvedValue({
      ...memory,
      title: "Buổi chiều đã được nhớ lại",
      revision: 2,
    });

    await expect(
      updateMemory({
        id: memory.id,
        title: "  Buổi chiều đã được nhớ lại  ",
        content: "  Ánh nắng vẫn nằm trên mặt bàn.  ",
        occurredOn: "2024-08-01",
        occurredOnPrecision: "MONTH",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      memory: {
        ...memory,
        title: "Buổi chiều đã được nhớ lại",
        revision: 2,
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(`/memories/${memory.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: "Buổi chiều đã được nhớ lại",
        content: "Ánh nắng vẫn nằm trên mặt bàn.",
        occurredOn: "2024-08-01",
        occurredOnPrecision: "MONTH",
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/memories");

    expect(revalidatePath).toHaveBeenCalledWith(`/memories/${memory.id}`);
  });

  it("rejects an invalid update before contacting the API", async () => {
    await expect(
      updateMemory({
        id: memory.id,
        title: "Một ký ức",
        content: "Nội dung",
        occurredOn: "2024-02-31",
        occurredOnPrecision: "DAY",
        expectedRevision: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preserves a revision conflict from the backend", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "MEMORY_REVISION_CONFLICT",
        message: "Ký ức đã thay đổi ở một phiên làm việc khác.",
      }),
    );

    await expect(
      updateMemory({
        id: memory.id,
        title: memory.title,
        content: memory.content,
        occurredOn: memory.occurredOn,
        occurredOnPrecision: memory.occurredOnPrecision,
        expectedRevision: memory.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "conflict",
      code: "MEMORY_REVISION_CONFLICT",
    });
  });

  it("loads the latest Memory for explicit conflict recovery", async () => {
    apiFetch.mockResolvedValue({
      ...memory,
      title: "Bản mới nhất từ server",
      revision: 2,
    });

    await expect(reloadMemory(memory.id)).resolves.toEqual({
      status: "success",
      memory: {
        ...memory,
        title: "Bản mới nhất từ server",
        revision: 2,
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(`/memories/${memory.id}`);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["trash", "TRASHED"],
    ["restore", "ACTIVE"],
  ] as const)("changes Memory state through %s", async (action, nextState) => {
    const lifecycleMemory = {
      ...memory,
      state: nextState,
      revision: 2,
      trashedAt: nextState === "TRASHED" ? "2026-08-15T10:00:00.000Z" : null,
    };

    apiFetch.mockResolvedValue(lifecycleMemory);

    await expect(
      changeMemoryState({
        id: memory.id,
        action,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "success",
      memory: lifecycleMemory,
    });

    expect(apiFetch).toHaveBeenCalledWith(`/memories/${memory.id}/${action}`, {
      method: "PATCH",
      body: JSON.stringify({
        expectedRevision: 1,
      }),
    });

    expect(revalidatePath).toHaveBeenCalledWith("/memories");

    expect(revalidatePath).toHaveBeenCalledWith(`/memories/${memory.id}`);
  });
  it("rejects an invalid lifecycle mutation", async () => {
    await expect(
      changeMemoryState({
        id: memory.id,
        action: "trash",
        expectedRevision: 0,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("preserves a lifecycle revision conflict", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "MEMORY_REVISION_CONFLICT",
        message: "Ký ức đã thay đổi ở một phiên làm việc khác.",
      }),
    );

    await expect(
      changeMemoryState({
        id: memory.id,
        action: "trash",
        expectedRevision: memory.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "conflict",
      code: "MEMORY_REVISION_CONFLICT",
    });
  });
  it("permanently deletes a trashed Memory at the expected revision", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(
      deleteMemoryPermanently({
        id: memory.id,
        expectedRevision: 4,
      }),
    ).resolves.toBeUndefined();

    expect(apiFetch).toHaveBeenCalledWith(
      `/memories/${memory.id}?expectedRevision=4`,
      {
        method: "DELETE",
      },
    );

    expect(revalidatePath).toHaveBeenCalledWith("/memories");
    expect(redirect).toHaveBeenCalledWith("/memories?state=TRASHED");
  });
  it("preserves permanent-delete domain errors", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "MEMORY_PERMANENT_DELETE_FORBIDDEN",
        message: "Chỉ ký ức trong Trash mới có thể bị xóa vĩnh viễn.",
      }),
    );

    await expect(
      deleteMemoryPermanently({
        id: memory.id,
        expectedRevision: memory.revision,
      }),
    ).resolves.toMatchObject({
      status: "error",
      kind: "conflict",
      code: "MEMORY_PERMANENT_DELETE_FORBIDDEN",
    });
  });
  it("rejects an invalid permanent delete", async () => {
    await expect(
      deleteMemoryPermanently({
        id: "not-a-memory-id",
        expectedRevision: 1,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu ký ức không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
