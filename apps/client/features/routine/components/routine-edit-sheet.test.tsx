// @vitest-environment jsdom

import type { RoutineDetailResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

const {
  updateRoutineTitle,
  reloadRoutine,
  changeRoutineState,
  refresh,
  notifySuccess,
} = vi.hoisted(() => ({
  updateRoutineTitle: vi.fn(),
  reloadRoutine: vi.fn(),
  changeRoutineState: vi.fn(),
  refresh: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

vi.mock("@/features/routine/actions/routine", () => ({
  createRoutine: vi.fn(),
  reloadRoutine,
  updateRoutineTitle,
  changeRoutineState,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import {
  RoutineDetailActions,
  RoutineDetailMeta,
  RoutineDetailTitle,
  RoutineEditProvider,
} from "./routine-edit-sheet";

const routine: RoutineDetailResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  title: "Khởi động ngày mới",
  habits: [
    {
      id: "0b6c1f1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f",
      title: "Uống nước",
      isActive: true,
      order: 0,
    },
  ],
  isActive: true,
  revision: 3,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

const detail = (initialRoutine: RoutineDetailResponse) => (
  <RoutineEditProvider initialRoutine={initialRoutine}>
    <h1>
      <RoutineDetailTitle />
    </h1>
    <RoutineDetailMeta />
    <RoutineDetailActions />
  </RoutineEditProvider>
);

const renderDetail = (initialRoutine = routine) =>
  render(detail(initialRoutine));

// Form được tải khi mở sheet; biên dịch nó lần đầu có thể quá thời gian chờ
// của findBy* khi máy bận, nên tải sẵn một lần trước các test.
beforeAll(() => import("./routine-editor"), 30_000);
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("RoutineEditProvider", () => {
  it("opens the form from the Edit button with the cursor in the name", async () => {
    renderDetail();

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));

    screen.getByRole("dialog", { name: "Chỉnh sửa Nếp sinh hoạt" });
    const name = await screen.findByLabelText("Tên Nếp sinh hoạt");
    await waitFor(() => expect(document.activeElement).toBe(name));
  });

  it("closes after saving, shows the new name and archives the new revision", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "success",
      routine: {
        id: routine.id,
        title: "Bắt đầu ngày mới",
        habitIds: [routine.habits[0]!.id],
        isActive: true,
        revision: 4,
        createdAt: routine.createdAt,
        updatedAt: "2026-08-15T08:00:00.000Z",
      },
    });
    changeRoutineState.mockResolvedValue({
      status: "success",
      routine: { ...routine, isActive: false, revision: 5 },
    });
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Bắt đầu ngày mới" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    screen.getByRole("heading", { name: "Bắt đầu ngày mới" });
    // Đổi tên không đụng tới danh sách Thói quen.
    expect(screen.getByText("1 Thói quen")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();

    // Chưa kịp refresh mà bấm Lưu trữ ngay vẫn phải dùng revision vừa lưu.
    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    await waitFor(() =>
      expect(changeRoutineState).toHaveBeenCalledWith({
        id: routine.id,
        expectedRevision: 4,
        action: "archive",
      }),
    );
  });

  it("asks before throwing away an unsaved name", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Tên đang viết dở" },
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

  it("keeps the typed name when the page refreshes underneath the sheet", async () => {
    const { rerender } = renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Tên Nếp sinh hoạt"), {
      target: { value: "Tên đang viết dở" },
    });
    // Một thao tác khác (vd sắp xếp Thói quen) vừa refresh xong.
    rerender(detail({ ...routine, title: "Tên từ server", revision: 4 }));

    expect(
      (screen.getByLabelText("Tên Nếp sinh hoạt") as HTMLInputElement).value,
    ).toBe("Tên đang viết dở");
    // Trang phía sau (đang bị sheet che) đã nhận bản mới của server.
    expect(document.querySelector("h1")?.textContent).toBe("Tên từ server");
  });

  // Nhiều bước bất đồng bộ nối nhau: khi cả bộ test chạy song song, 5 giây
  // mặc định không đủ.
  it("uses the latest revision on the page after loading it during a conflict", async () => {
    updateRoutineTitle.mockResolvedValue({
      status: "error",
      kind: "conflict",
      code: "ROUTINE_REVISION_CONFLICT",
      message: "Nếp sinh hoạt đã thay đổi ở một phiên làm việc khác.",
    });
    reloadRoutine.mockResolvedValue({
      status: "success",
      routine: { ...routine, title: "Bản mới nhất từ server", revision: 5 },
    });
    changeRoutineState.mockResolvedValue({
      status: "success",
      routine: { ...routine, isActive: false, revision: 6 },
    });
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    await screen.findByLabelText("Tên Nếp sinh hoạt");
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    const useLatest = await screen.findByRole("button", {
      name: "Dùng bản mới nhất",
    });
    await waitFor(() =>
      expect((useLatest as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(useLatest);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Tên Nếp sinh hoạt") as HTMLInputElement).value,
      ).toBe("Bản mới nhất từ server"),
    );
    // Ô đã có bản mới nhưng form còn bận thêm một nhịp; Hủy bị khóa tới lúc đó.
    const cancel = screen.getByRole("button", { name: "Hủy" });
    await waitFor(() =>
      expect((cancel as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await screen.findByRole("heading", { name: "Bản mới nhất từ server" });
    fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    await waitFor(() =>
      expect(changeRoutineState).toHaveBeenCalledWith({
        id: routine.id,
        expectedRevision: 5,
        action: "archive",
      }),
    );
  }, 15_000);

  it("offers no editing for an archived routine", () => {
    renderDetail({ ...routine, isActive: false });

    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
    screen.getByRole("button", { name: "Khôi phục" });
  });
});
