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

const { createHabit, reloadHabit, updateHabit, push, refresh, notifySuccess } =
  vi.hoisted(() => ({
    createHabit: vi.fn(),
    reloadHabit: vi.fn(),
    updateHabit: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    notifySuccess: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/habit/actions/habit", () => ({
  createHabit,
  reloadHabit,
  updateHabit,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

const onSaved = vi.fn();
const onCancel = vi.fn();
const onDirtyChange = vi.fn();

import { HabitEditor } from "./habit-editor";

const existingHabit: HabitResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Thiền 10 phút",
  description: "Một hành động nhỏ để lặp lại có chủ ý.",
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  isActive: true,
  revision: 3,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);
afterEach(() => vi.useRealTimers());

describe("HabitEditor", () => {
  it("creates a Habit and navigates to its detail", async () => {
    createHabit.mockResolvedValue({ status: "success", habit: existingHabit });

    render(<HabitEditor />);

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 10 phút" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Tạo thói quen" }));

    await waitFor(() =>
      expect(createHabit).toHaveBeenCalledWith({
        type: "BUILD",
        title: "Thiền 10 phút",
        description: "",
        frequencyType: "DAILY",
        frequencyDays: [],
      }),
    );

    expect(push).toHaveBeenCalledWith(`/habits/${existingHabit.id}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(
      `Đã tạo "${existingHabit.title}"`,
    );
  });

  it("creates a QUIT Habit defaulting quitStartedAt to today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T03:00:00.000Z"));

    const quitHabit = {
      ...existingHabit,
      type: "QUIT" as const,
      frequencyType: null,
      quitStartedAt: "2026-08-14",
    };
    createHabit.mockResolvedValue({ status: "success", habit: quitHabit });

    render(<HabitEditor />);

    fireEvent.click(screen.getByRole("radio", { name: "Từ bỏ điều xấu" }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Bỏ hút thuốc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo thói quen" }));

    await vi.waitFor(() => expect(createHabit).toHaveBeenCalledOnce());

    expect(createHabit).toHaveBeenCalledWith({
      type: "QUIT",
      title: "Bỏ hút thuốc",
      description: "",
      quitStartedAt: "2026-08-14",
    });
    expect(push).toHaveBeenCalledWith(`/habits/${quitHabit.id}`);
  });

  it("leaves out the type when editing, since it cannot change", () => {
    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText("Loại thói quen")).toBeNull();
  });

  it("puts the cursor in the title when editing", () => {
    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );

    expect(document.activeElement).toBe(screen.getByLabelText("Tên thói quen"));
  });

  it("updates the current revision in edit mode", async () => {
    updateHabit.mockResolvedValue({
      status: "success",
      habit: { ...existingHabit, title: "Thiền 15 phút", revision: 4 },
    });

    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 15 phút" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() =>
      expect(updateHabit).toHaveBeenCalledWith({
        type: "BUILD",
        title: "Thiền 15 phút",
        description: existingHabit.description,
        frequencyType: "DAILY",
        frequencyDays: [],
        id: existingHabit.id,
        expectedRevision: existingHabit.revision,
      }),
    );

    expect(createHabit).not.toHaveBeenCalled();
    // Sheet tự đóng và làm mới trang; form không điều hướng.
    expect(onSaved).toHaveBeenCalledWith({
      ...existingHabit,
      title: "Thiền 15 phút",
      revision: 4,
    });
    expect(push).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith('Đã cập nhật "Thiền 15 phút"');
  });

  it("loads the latest revision without relying on router refresh", async () => {
    updateHabit.mockResolvedValue({
      status: "error",
      kind: "conflict",
      code: "HABIT_REVISION_CONFLICT",
      message: "Thói quen đã thay đổi ở một phiên làm việc khác.",
    });
    reloadHabit.mockResolvedValue({
      status: "success",
      habit: {
        ...existingHabit,
        title: "Bản mới nhất từ server",
        revision: 4,
      },
    });

    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(
      await screen.findByRole("heading", {
        name: "Thói quen đã được thay đổi ở nơi khác",
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
      expect(reloadHabit).toHaveBeenCalledWith(existingHabit.id),
    );

    expect(
      (screen.getByLabelText("Tên thói quen") as HTMLInputElement).value,
    ).toBe("Bản mới nhất từ server");
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("rebases preserved local content onto the latest revision", async () => {
    updateHabit
      .mockResolvedValueOnce({
        status: "error",
        kind: "conflict",
        code: "HABIT_REVISION_CONFLICT",
        message: "Thói quen đã thay đổi ở một phiên làm việc khác.",
      })
      .mockResolvedValueOnce({
        status: "success",
        habit: {
          ...existingHabit,
          title: "Bản local được giữ lại",
          revision: 5,
        },
      });
    reloadHabit.mockResolvedValue({
      status: "success",
      habit: { ...existingHabit, title: "Bản mới nhất từ server", revision: 4 },
    });

    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Bản local được giữ lại" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    const keepLocalButton = await screen.findByRole("button", {
      name: "Ghi nội dung đang viết",
    });

    await waitFor(() =>
      expect((keepLocalButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(keepLocalButton);

    await waitFor(() => expect(updateHabit).toHaveBeenCalledTimes(2));

    expect(updateHabit).toHaveBeenLastCalledWith({
      type: "BUILD",
      title: "Bản local được giữ lại",
      description: existingHabit.description,
      frequencyType: "DAILY",
      frequencyDays: [],
      id: existingHabit.id,
      expectedRevision: 4,
    });

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Bản local được giữ lại", revision: 5 }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Bản local được giữ lại"',
    );
  });

  it("keeps the draft on screen when the habit was archived elsewhere", async () => {
    updateHabit.mockResolvedValue({
      status: "error",
      kind: "conflict",
      code: "HABIT_REVISION_CONFLICT",
      message: "Thói quen đã thay đổi ở một phiên làm việc khác.",
    });
    reloadHabit.mockResolvedValue({
      status: "success",
      habit: { ...existingHabit, isActive: false, revision: 4 },
    });

    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Bản đang viết dở" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    const keepLocalButton = await screen.findByRole("button", {
      name: "Ghi nội dung đang viết",
    });

    await waitFor(() =>
      expect((keepLocalButton as HTMLButtonElement).disabled).toBe(false),
    );

    fireEvent.click(keepLocalButton);

    expect(
      await screen.findByText(
        "Thói quen đã được lưu trữ ở nơi khác. Nội dung đang viết vẫn được giữ trên màn hình để sao chép.",
      ),
    ).toBeTruthy();

    expect(
      (screen.getByLabelText("Tên thói quen") as HTMLInputElement).value,
    ).toBe("Bản đang viết dở");
    expect(updateHabit).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("hands Cancel to the sheet", () => {
    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("tells the sheet when a field has unsaved changes", () => {
    render(
      <HabitEditor
        initialHabit={existingHabit}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 20 phút" },
    });

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("is clean again once the days selection matches the persisted habit", () => {
    render(
      <HabitEditor
        initialHabit={{
          ...existingHabit,
          frequencyType: "WEEKLY",
          frequencyDays: [1, 3],
        }}
        onSaved={onSaved}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );

    const dayOne = screen.getByRole("button", { name: "T2" });
    fireEvent.click(dayOne);
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(dayOne);

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("warns about leaving the create form once something is typed", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<HabitEditor />);

    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Thiền 20 phút" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });
});
