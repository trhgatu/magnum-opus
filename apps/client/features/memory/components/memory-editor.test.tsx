// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryResponse } from "@repo/contracts";
const {
  createMemory,
  reloadMemory,
  updateMemory,
  push,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  createMemory: vi.fn(),
  reloadMemory: vi.fn(),
  updateMemory: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

vi.mock("@/features/memory/actions/memory", () => ({
  createMemory,
  reloadMemory,
  updateMemory,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

vi.mock("@/features/memory/components/memory-date-field", () => ({
  MemoryDateField: ({
    precision,
    value,
    disabled,
    onPrecisionChange,
    onValueChange,
  }: {
    precision: string;
    value: string;
    disabled?: boolean;
    onPrecisionChange: (precision: string) => void;
    onValueChange: (value: string) => void;
  }) => (
    <fieldset disabled={disabled}>
      <label htmlFor="memory-date-precision">Độ chính xác của thời gian</label>
      <select
        id="memory-date-precision"
        value={precision}
        onChange={(event) => onPrecisionChange(event.target.value)}
      >
        <option value="DAY">Ngày cụ thể</option>
        <option value="MONTH">Tháng</option>
        <option value="YEAR">Năm</option>
        <option value="UNKNOWN">Không rõ thời gian</option>
      </select>

      {precision === "UNKNOWN" ? null : (
        <>
          <label htmlFor="memory-occurred-on">Thời điểm xảy ra</label>
          <input
            id="memory-occurred-on"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </>
      )}
    </fieldset>
  ),
}));

import { MemoryEditor } from "./memory-editor";

const existingMemory: MemoryResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  sourceJournalEntryId: null,
  title: "Buổi chiều bên cửa sổ",
  content: "Ánh nắng nằm yên trên mặt bàn.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH",
  state: "ACTIVE",
  revision: 3,
  trashedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("MemoryEditor", () => {
  it("creates a standalone Memory with an unknown date", async () => {
    createMemory.mockResolvedValue({
      status: "success",
      memory: {
        id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
        title: "Buổi chiều bên cửa sổ",
      },
    });

    render(<MemoryEditor />);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: {
        value: "Buổi chiều bên cửa sổ",
      },
    });

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: {
        value: "Ánh nắng nằm yên trên mặt bàn.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu ký ức",
      }),
    );

    await waitFor(() =>
      expect(createMemory).toHaveBeenCalledWith({
        sourceJournalEntryId: null,
        title: "Buổi chiều bên cửa sổ",
        content: "Ánh nắng nằm yên trên mặt bàn.",
        occurredOn: null,
        occurredOnPrecision: "UNKNOWN",
      }),
    );

    expect(push).toHaveBeenCalledWith(
      "/memories/72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
    );

    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã lưu ký ức "Buổi chiều bên cửa sổ"',
    );
  });

  it("creates an editable Memory from a Journal seed", async () => {
    const sourceJournalEntryId = "cc2a5d7a-72ba-41ce-9ad8-c82941270f35";

    createMemory.mockResolvedValue({
      status: "success",
      memory: {
        id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
      },
    });

    render(
      <MemoryEditor
        creationSeed={{
          sourceJournalEntryId,
          title: "Một buổi chiều",
          content: "Toàn bộ nội dung Journal ban đầu.",
        }}
      />,
    );

    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe(
      "Một buổi chiều",
    );

    expect(
      (screen.getByLabelText("Nội dung") as HTMLTextAreaElement).value,
    ).toBe("Toàn bộ nội dung Journal ban đầu.");

    expect(
      screen
        .getByRole("link", {
          name: "Mở trang nguồn",
        })
        .getAttribute("href"),
    ).toBe(`/journal/${sourceJournalEntryId}`);

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: {
        value: "Phần ký ức đã được chọn lọc.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu ký ức",
      }),
    );

    await waitFor(() =>
      expect(createMemory).toHaveBeenCalledWith({
        sourceJournalEntryId,
        title: "Một buổi chiều",
        content: "Phần ký ức đã được chọn lọc.",
        occurredOn: null,
        occurredOnPrecision: "UNKNOWN",
      }),
    );
  });

  it("normalizes a month before creating the Memory", async () => {
    createMemory.mockResolvedValue({
      status: "success",
      memory: {
        id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
      },
    });

    render(<MemoryEditor />);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: {
        value: "Mùa hè",
      },
    });

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: {
        value: "Một mùa hè còn được nhớ.",
      },
    });

    fireEvent.change(screen.getByLabelText("Độ chính xác của thời gian"), {
      target: {
        value: "MONTH",
      },
    });

    fireEvent.change(screen.getByLabelText("Thời điểm xảy ra"), {
      target: {
        value: "2024-08",
      },
    });

    fireEvent.submit(
      screen
        .getByRole("button", {
          name: "Lưu ký ức",
        })
        .closest("form")!,
    );

    await waitFor(() =>
      expect(createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          occurredOn: "2024-08-01",
          occurredOnPrecision: "MONTH",
        }),
      ),
    );
  });

  it("shows an invalid-date message without calling the action", () => {
    render(<MemoryEditor />);

    fireEvent.change(screen.getByLabelText("Độ chính xác của thời gian"), {
      target: {
        value: "DAY",
      },
    });

    fireEvent.change(screen.getByLabelText("Thời điểm xảy ra"), {
      target: {
        value: "2024-02-31",
      },
    });

    fireEvent.submit(
      screen
        .getByRole("button", {
          name: "Lưu ký ức",
        })
        .closest("form")!,
    );

    expect(screen.getByText("Thời điểm xảy ra chưa hợp lệ.")).toBeTruthy();

    expect(createMemory).not.toHaveBeenCalled();
  });

  it("shows a safe error returned by the Server Action", async () => {
    createMemory.mockResolvedValue({
      status: "error",
      message: "Không thể lưu ký ức.",
    });

    render(<MemoryEditor />);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: {
        value: "Một ký ức",
      },
    });

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: {
        value: "Nội dung của ký ức.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu ký ức",
      }),
    );

    expect(await screen.findByText("Không thể lưu ký ức.")).toBeTruthy();

    expect(push).not.toHaveBeenCalled();
  });
  it("initializes edit mode from the persisted Memory", () => {
    render(<MemoryEditor initialMemory={existingMemory} />);

    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe(
      "Buổi chiều bên cửa sổ",
    );

    expect(
      (screen.getByLabelText("Nội dung") as HTMLTextAreaElement).value,
    ).toBe("Ánh nắng nằm yên trên mặt bàn.");

    expect(
      (screen.getByLabelText("Độ chính xác của thời gian") as HTMLSelectElement)
        .value,
    ).toBe("MONTH");

    expect(
      (screen.getByLabelText("Thời điểm xảy ra") as HTMLInputElement).value,
    ).toBe("2024-08");

    expect(
      screen
        .getByRole("link", {
          name: "Hủy",
        })
        .getAttribute("href"),
    ).toBe(`/memories/${existingMemory.id}`);
  });

  it("updates the current revision in edit mode", async () => {
    updateMemory.mockResolvedValue({
      status: "success",
      memory: {
        ...existingMemory,
        title: "Buổi chiều được nhớ lại",
        revision: 4,
      },
    });

    render(<MemoryEditor initialMemory={existingMemory} />);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: {
        value: "Buổi chiều được nhớ lại",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu thay đổi",
      }),
    );

    await waitFor(() =>
      expect(updateMemory).toHaveBeenCalledWith({
        id: existingMemory.id,
        title: "Buổi chiều được nhớ lại",
        content: existingMemory.content,
        occurredOn: "2024-08-01",
        occurredOnPrecision: "MONTH",
        expectedRevision: 3,
      }),
    );

    expect(createMemory).not.toHaveBeenCalled();

    expect(push).toHaveBeenCalledWith(`/memories/${existingMemory.id}`);
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Buổi chiều được nhớ lại"',
    );
  });

  it("loads the latest revision without relying on router refresh", async () => {
    updateMemory.mockResolvedValue({
      status: "error",
      kind: "conflict",
      code: "MEMORY_REVISION_CONFLICT",
      message: "Ký ức đã thay đổi ở một phiên làm việc khác.",
    });
    reloadMemory.mockResolvedValue({
      status: "success",
      memory: {
        ...existingMemory,
        title: "Bản mới nhất từ server",
        content: "Nội dung mới nhất từ server.",
        revision: 4,
      },
    });

    render(<MemoryEditor initialMemory={existingMemory} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu thay đổi",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Ký ức đã được thay đổi ở nơi khác",
      }),
    ).toBeTruthy();

    const useLatestButton = screen.getByRole("button", {
      name: "Dùng bản mới nhất",
    });

    await waitFor(() =>
      expect((useLatestButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(useLatestButton);

    await waitFor(() =>
      expect(reloadMemory).toHaveBeenCalledWith(existingMemory.id),
    );

    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe(
      "Bản mới nhất từ server",
    );
    expect(
      (screen.getByLabelText("Nội dung") as HTMLTextAreaElement).value,
    ).toBe("Nội dung mới nhất từ server.");
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("rebases preserved local content onto the latest revision", async () => {
    updateMemory
      .mockResolvedValueOnce({
        status: "error",
        kind: "conflict",
        code: "MEMORY_REVISION_CONFLICT",
        message: "Ký ức đã thay đổi ở một phiên làm việc khác.",
      })
      .mockResolvedValueOnce({
        status: "success",
        memory: {
          ...existingMemory,
          title: "Bản local được giữ lại",
          revision: 5,
        },
      });
    reloadMemory.mockResolvedValue({
      status: "success",
      memory: {
        ...existingMemory,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(<MemoryEditor initialMemory={existingMemory} />);

    fireEvent.change(screen.getByLabelText("Tiêu đề"), {
      target: {
        value: "Bản local được giữ lại",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Lưu thay đổi",
      }),
    );

    const keepLocalButton = await screen.findByRole("button", {
      name: "Ghi nội dung đang viết",
    });

    await waitFor(() =>
      expect((keepLocalButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(keepLocalButton);

    await waitFor(() => expect(updateMemory).toHaveBeenCalledTimes(2));

    expect(updateMemory).toHaveBeenLastCalledWith({
      id: existingMemory.id,
      title: "Bản local được giữ lại",
      content: existingMemory.content,
      occurredOn: "2024-08-01",
      occurredOnPrecision: "MONTH",
      expectedRevision: 4,
    });

    expect(push).toHaveBeenCalledWith(`/memories/${existingMemory.id}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Bản local được giữ lại"',
    );
  });
});
