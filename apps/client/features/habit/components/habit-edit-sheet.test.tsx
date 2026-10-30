// @vitest-environment jsdom

import type { HabitResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { updateHabit, changeHabitState, refresh, notifySuccess } = vi.hoisted(
  () => ({
    updateHabit: vi.fn(),
    changeHabitState: vi.fn(),
    refresh: vi.fn(),
    notifySuccess: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

vi.mock("@/features/habit/actions/habit", () => ({
  createHabit: vi.fn(),
  reloadHabit: vi.fn(),
  updateHabit,
  changeHabitState,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import {
  HabitDetailActions,
  HabitDetailMeta,
  HabitEditableDescription,
  HabitEditableTitle,
  HabitEditProvider,
} from "./habit-edit-sheet";

const habit: HabitResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Thiền 10 phút",
  description: null,
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  isActive: true,
  revision: 3,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

const renderDetail = (initialHabit = habit) =>
  render(
    <HabitEditProvider initialHabit={initialHabit}>
      <h1>
        <HabitEditableTitle />
      </h1>
      <p>
        <HabitEditableDescription placeholder="Một hành động nhỏ." />
      </p>
      <HabitDetailActions />
    </HabitEditProvider>,
  );

// Form được tải khi mở sheet; biên dịch nó lần đầu có thể quá thời gian chờ
// của findBy* khi máy bận, nên tải sẵn một lần trước các test.
beforeAll(() => import("./habit-editor"), 30_000);
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("HabitEditProvider", () => {
  it("opens the form from the Edit button with the cursor in the title", async () => {
    renderDetail();

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));

    screen.getByRole("dialog", { name: "Chỉnh sửa thói quen" });
    const title = await screen.findByLabelText("Tên thói quen");
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  it("opens the form at the title when the title is clicked", async () => {
    renderDetail();

    // Gợi ý cho trình đọc màn hình không lọt vào tên của tiêu đề trang.
    const heading = screen.getByRole("heading", { name: "Thiền 10 phút" });
    fireEvent.click(
      within(heading).getByRole("button", {
        name: "Thiền 10 phút",
        description: "Bấm để chỉnh sửa tên thói quen",
      }),
    );

    const title = await screen.findByLabelText("Tên thói quen");
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  it("opens the form at the description when the description is clicked", async () => {
    renderDetail();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Một hành động nhỏ. Bấm để thêm mô tả.",
        description: "Bấm để chỉnh sửa mô tả thói quen",
      }),
    );

    const description = await screen.findByLabelText("Ý nghĩa");
    await waitFor(() => expect(document.activeElement).toBe(description));
  });

  it("closes after saving, shows the new title and archives the new revision", async () => {
    const saved = { ...habit, title: "Thiền 15 phút", revision: 4 };
    updateHabit.mockResolvedValue({ status: "success", habit: saved });
    changeHabitState.mockResolvedValue({
      status: "success",
      habit: { ...saved, isActive: false, revision: 5 },
    });
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Tên thói quen"), {
      target: { value: "Thiền 15 phút" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    screen.getByRole("heading", { name: "Thiền 15 phút" });
    expect(refresh).toHaveBeenCalledOnce();

    // Chưa kịp refresh mà bấm Lưu trữ ngay vẫn phải dùng revision vừa lưu.
    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    await waitFor(() =>
      expect(changeHabitState).toHaveBeenCalledWith({
        id: habit.id,
        expectedRevision: 4,
        action: "archive",
      }),
    );
  });

  it("shows the saved schedule without waiting for the page to refresh", async () => {
    updateHabit.mockResolvedValue({
      status: "success",
      habit: {
        ...habit,
        frequencyType: "WEEKLY",
        frequencyDays: [1, 3, 5],
        revision: 4,
      },
    });
    render(
      <HabitEditProvider initialHabit={habit}>
        <HabitDetailMeta />
        <HabitDetailActions />
      </HabitEditProvider>,
    );
    expect(screen.getByText("Mỗi ngày")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    await screen.findByLabelText("Tên thói quen");
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(await screen.findByText("T2 · T4 · T6")).toBeTruthy();
  });

  it("asks before throwing away unsaved changes", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Tên thói quen"), {
      target: { value: "Thiền 20 phút" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    screen.getByRole("dialog");

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("closes without asking when nothing changed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.click(await screen.findByRole("button", { name: "Hủy" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("offers no editing for an archived habit", () => {
    renderDetail({ ...habit, isActive: false });

    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
    // Tên và mô tả chỉ là chữ, không còn là nút mở sheet.
    expect(
      within(screen.getByRole("heading")).queryByRole("button"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Một hành động nhỏ/ }),
    ).toBeNull();
    screen.getByRole("heading", { name: "Thiền 10 phút" });
    expect(screen.getByText("Một hành động nhỏ.")).toBeTruthy();
    screen.getByRole("button", { name: "Khôi phục" });
  });
});
