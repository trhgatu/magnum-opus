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

import { updateHabit } from "@/features/habit/actions/habit";
import {
  HabitFieldsProvider,
  HabitInlineDescription,
  HabitInlineTitle,
} from "./habit-inline-fields";

vi.mock("@/features/habit/actions/habit", () => ({
  updateHabit: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(updateHabit);

const baseHabit: HabitResponse = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Đọc sách",
  description: null,
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  isActive: true,
  revision: 3,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("HabitInlineTitle", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("saves the trimmed title on blur, passing through the current type-specific fields", async () => {
    mutation.mockResolvedValue({
      status: "success",
      habit: { ...baseHabit, title: "Đọc sách mỗi tối", revision: 4 },
    });

    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    const input = screen.getByLabelText("Tên thói quen");
    fireEvent.change(input, { target: { value: "  Đọc sách mỗi tối  " } });
    fireEvent.blur(input);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith({
      id: baseHabit.id,
      expectedRevision: baseHabit.revision,
      title: "Đọc sách mỗi tối",
      description: null,
      type: "BUILD",
      frequencyType: "DAILY",
      frequencyDays: [],
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("cancels on Escape without saving", () => {
    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    const input = screen.getByLabelText("Tên thói quen");
    fireEvent.change(input, { target: { value: "Something else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByRole("button", { name: /Đọc sách/ })).toBeTruthy();
    expect(mutation).not.toHaveBeenCalled();
  });

  it("does not save an empty title", () => {
    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    const input = screen.getByLabelText("Tên thói quen");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    expect(mutation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Đọc sách/ })).toBeTruthy();
  });

  it("shows a reload affordance on a revision conflict, and clears it once dismissed via Escape", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "conflict",
      code: "HABIT_REVISION_CONFLICT",
    });

    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    const input = screen.getByLabelText("Tên thói quen");
    fireEvent.change(input, { target: { value: "Đọc sách buổi sáng" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(
        screen.getByText("Thói quen đã thay đổi ở một phiên làm việc khác."),
      ).toBeTruthy(),
    );

    // Escape hủy sửa — lỗi cũ không được sống sót sang lần mở sửa kế tiếp.
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    expect(
      screen.queryByText("Thói quen đã thay đổi ở một phiên làm việc khác."),
    ).toBeNull();
  });

  it("clicking the reload affordance refreshes without saving the stale draft again", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "conflict",
      code: "HABIT_REVISION_CONFLICT",
    });

    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    const input = screen.getByLabelText("Tên thói quen");
    fireEvent.change(input, { target: { value: "Đọc sách buổi sáng" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));
    expect(refresh).toHaveBeenCalledOnce();
    // mousedown trên nút reload chặn blur của input, nên không có lần lưu
    // thứ hai với cùng revision đã xung đột.
    expect(mutation).toHaveBeenCalledOnce();
  });

  it("renders as plain text, not editable, when the Habit is archived", () => {
    render(
      <HabitFieldsProvider initialHabit={{ ...baseHabit, isActive: false }}>
        <HabitInlineTitle />
      </HabitFieldsProvider>,
    );

    expect(screen.queryByRole("button", { name: /Đọc sách/ })).toBeNull();
    expect(screen.getByText("Đọc sách")).toBeTruthy();
  });
});

describe("HabitInlineDescription", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("shows the placeholder and saves a new description for a QUIT-type Habit", async () => {
    const quitHabit: HabitResponse = {
      ...baseHabit,
      type: "QUIT",
      frequencyType: null,
      quitStartedAt: "2026-08-01",
    };
    mutation.mockResolvedValue({
      status: "success",
      habit: { ...quitHabit, description: "Vì sức khỏe của mình." },
    });

    render(
      <HabitFieldsProvider initialHabit={quitHabit}>
        <HabitInlineDescription placeholder="Chưa có mô tả." />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    const textarea = screen.getByLabelText("Mô tả thói quen");
    fireEvent.change(textarea, {
      target: { value: "Vì sức khỏe của mình." },
    });
    fireEvent.blur(textarea);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith({
      id: quitHabit.id,
      expectedRevision: quitHabit.revision,
      title: quitHabit.title,
      description: "Vì sức khỏe của mình.",
      type: "QUIT",
      quitStartedAt: "2026-08-01",
    });
  });

  it("clearing the description down to blank saves null", async () => {
    const habitWithDescription = { ...baseHabit, description: "Cũ" };
    mutation.mockResolvedValue({
      status: "success",
      habit: { ...habitWithDescription, description: null },
    });

    render(
      <HabitFieldsProvider initialHabit={habitWithDescription}>
        <HabitInlineDescription placeholder="Chưa có mô tả." />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cũ/ }));
    const textarea = screen.getByLabelText("Mô tả thói quen");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.blur(textarea);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });

  it("is not clickable when the Habit is archived", () => {
    render(
      <HabitFieldsProvider initialHabit={{ ...baseHabit, isActive: false }}>
        <HabitInlineDescription placeholder="Chưa có mô tả." />
      </HabitFieldsProvider>,
    );

    expect(screen.queryByRole("button", { name: /Chưa có mô tả/ })).toBeNull();
    expect(screen.getByText("Chưa có mô tả.")).toBeTruthy();
  });
});

describe("HabitFieldsProvider sharing state across title and description", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("uses the revision from a successful title save when the description is saved right after", async () => {
    mutation
      .mockResolvedValueOnce({
        status: "success",
        habit: { ...baseHabit, title: "Đọc sách mỗi tối", revision: 4 },
      })
      .mockResolvedValueOnce({
        status: "success",
        habit: {
          ...baseHabit,
          title: "Đọc sách mỗi tối",
          description: "Trước khi ngủ",
          revision: 5,
        },
      });

    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
        <HabitInlineDescription placeholder="Chưa có mô tả." />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Đọc sách mỗi tối" },
    });
    fireEvent.blur(screen.getByLabelText("Tên thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả thói quen"), {
      target: { value: "Trước khi ngủ" },
    });
    fireEvent.blur(screen.getByLabelText("Mô tả thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));

    // Field thứ hai phải dùng revision 4 (kết quả của lần lưu đầu), không
    // phải revision 3 ban đầu — nếu không sẽ luôn bị 409.
    expect(mutation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});
