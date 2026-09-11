// @vitest-environment jsdom

import type { HabitResponse } from "@repo/contracts";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitState, updateHabit } from "@/features/habit/actions/habit";
import {
  HabitFieldsProvider,
  HabitInlineDescription,
  HabitInlineTitle,
  HabitLifecycleControlsInline,
} from "./habit-inline-fields";

// `fireEvent.blur` chỉ dispatch sự kiện, không thật sự đổi
// `document.activeElement` — nếu test sau đó click sang một phần tử khác,
// jsdom sẽ tự blur phần tử vẫn đang "focused" thật sự lần nữa (đúng hành vi
// browser thật), gây ra blur kép ngoài ý muốn của test. Dùng `.blur()` gốc
// (bọc trong `act`) để giả lập chính xác một lần rời focus duy nhất.
function blurElement(element: HTMLElement) {
  act(() => {
    element.blur();
  });
}

vi.mock("@/features/habit/actions/habit", () => ({
  updateHabit: vi.fn(),
  changeHabitState: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  notifySuccess: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(updateHabit);
const lifecycleMutation = vi.mocked(changeHabitState);

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
    blurElement(input);

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
    blurElement(input);

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
    blurElement(input);

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
    blurElement(input);

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
    blurElement(textarea);

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
    blurElement(textarea);

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
    blurElement(screen.getByLabelText("Tên thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả thói quen"), {
      target: { value: "Trước khi ngủ" },
    });
    blurElement(screen.getByLabelText("Mô tả thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));

    // Field thứ hai phải dùng revision 4 (kết quả của lần lưu đầu), không
    // phải revision 3 ban đầu — nếu không sẽ luôn bị 409.
    expect(mutation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });

  it("queues a truly concurrent save behind the in-flight one and merges in its result", async () => {
    let resolveFirst!: (value: Awaited<ReturnType<typeof updateHabit>>) => void;
    const firstCall = new Promise<Awaited<ReturnType<typeof updateHabit>>>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    mutation.mockImplementationOnce(() => firstCall);
    mutation.mockResolvedValueOnce({
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

    // Sửa title trước — request đầu tiên cố tình chưa resolve.
    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Đọc sách mỗi tối" },
    });
    blurElement(screen.getByLabelText("Tên thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    // Sửa description ngay lập tức, trước khi request title kịp resolve —
    // đây là trường hợp đồng thời thật sự, không phải tuần tự. Request thứ
    // hai bị xếp hàng phía sau (chưa resolve firstCall) nên vẫn chưa được
    // gửi đi lúc này — chỉ có thể xác nhận gián tiếp qua revision nó dùng
    // ở assertion cuối, vì chờ "chưa gọi lần 2" một cách đáng tin cậy giữa
    // hai microtask là không ổn định.
    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả thói quen"), {
      target: { value: "Trước khi ngủ" },
    });
    blurElement(screen.getByLabelText("Mô tả thói quen"));

    resolveFirst({
      status: "success",
      habit: { ...baseHabit, title: "Đọc sách mỗi tối", revision: 4 },
    });

    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));
    // Request thứ hai phải mang theo revision 4 (từ kết quả request đầu)
    // và title mới (không phải title cũ mà field description đã đóng gói
    // lúc component còn chưa re-render).
    expect(mutation).toHaveBeenNthCalledWith(2, {
      id: baseHabit.id,
      expectedRevision: 4,
      title: "Đọc sách mỗi tối",
      description: "Trước khi ngủ",
      type: "BUILD",
      frequencyType: "DAILY",
      frequencyDays: [],
    });
  });
});

describe("HabitLifecycleControlsInline", () => {
  beforeEach(() => {
    mutation.mockReset();
    lifecycleMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("archives using the revision from a just-completed inline save, not the initial prop", async () => {
    mutation.mockResolvedValue({
      status: "success",
      habit: { ...baseHabit, title: "Đọc sách mỗi tối", revision: 4 },
    });
    lifecycleMutation.mockResolvedValue({
      status: "success",
      habit: { ...baseHabit, title: "Đọc sách mỗi tối", isActive: false },
    });

    render(
      <HabitFieldsProvider initialHabit={baseHabit}>
        <HabitInlineTitle />
        <HabitLifecycleControlsInline />
      </HabitFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Đọc sách/ }));
    fireEvent.change(screen.getByLabelText("Tên thói quen"), {
      target: { value: "Đọc sách mỗi tối" },
    });
    blurElement(screen.getByLabelText("Tên thói quen"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));

    await waitFor(() => expect(lifecycleMutation).toHaveBeenCalledOnce());
    expect(lifecycleMutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});
