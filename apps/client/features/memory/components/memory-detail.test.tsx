// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { MemoryResponse } from "@repo/contracts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { updateMemory, refresh } = vi.hoisted(() => ({
  updateMemory: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

vi.mock("@/features/memory/actions/memory", () => ({
  createMemory: vi.fn(),
  reloadMemory: vi.fn(),
  updateMemory,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess: vi.fn() }));

// Chỉ cần biết nút Thùng rác nhận revision nào.
vi.mock("@/features/memory/components/memory-lifecycle-controls", () => ({
  MemoryLifecycleControls: ({ revision }: { revision: number }) => (
    <span>revision {revision}</span>
  ),
}));

import { MemoryDetail } from "./memory-detail";

const memory: MemoryResponse = {
  id: "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676",
  sourceJournalEntryId: "cc2a5d7a-72ba-41ce-9ad8-c82941270f35",
  title: "Buổi chiều bên cửa sổ",
  content: "Ánh nắng nằm yên trên mặt bàn.",
  occurredOn: "2024-08-01",
  occurredOnPrecision: "MONTH",
  state: "ACTIVE",
  revision: 2,
  trashedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T11:00:00.000Z",
};

// Form được tải khi mở sheet; biên dịch nó lần đầu có thể quá thời gian chờ
// của findBy* khi máy bận, nên tải sẵn một lần trước các test.
beforeAll(() => import("./memory-editor"), 30_000);
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("MemoryDetail", () => {
  it("renders the Memory and preserves date precision", () => {
    render(<MemoryDetail memory={memory} timeZone="Asia/Ho_Chi_Minh" />);

    expect(
      screen.getByRole("heading", {
        name: "Buổi chiều bên cửa sổ",
      }),
    ).toBeTruthy();

    expect(screen.getByText("Tháng 8, 2024")).toBeTruthy();

    expect(screen.getByText("Ánh nắng nằm yên trên mặt bàn.")).toBeTruthy();
  });

  it("links to the source Journal entry", () => {
    render(<MemoryDetail memory={memory} timeZone="Asia/Ho_Chi_Minh" />);

    expect(
      screen
        .getByRole("link", {
          name: "Mở Nhật ký nguồn",
        })
        .getAttribute("href"),
    ).toBe("/journal/cc2a5d7a-72ba-41ce-9ad8-c82941270f35");
  });

  it("edits an active Memory in a sheet and shows the saved version", async () => {
    updateMemory.mockResolvedValue({
      status: "success",
      memory: {
        ...memory,
        content: "Ánh nắng vẫn còn đó.",
        revision: 3,
      },
    });
    render(<MemoryDetail memory={memory} timeZone="Asia/Ho_Chi_Minh" />);

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    screen.getByRole("dialog", { name: "Chỉnh sửa ký ức" });
    const title = await screen.findByLabelText("Tiêu đề");
    await waitFor(() => expect(document.activeElement).toBe(title));

    fireEvent.change(screen.getByLabelText("Nội dung"), {
      target: { value: "Ánh nắng vẫn còn đó." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Ánh nắng vẫn còn đó.")).toBeTruthy();
    // Thùng rác dùng ngay revision vừa lưu, không chờ refresh.
    expect(screen.getByText("revision 3")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("asks before closing the sheet with unsaved changes", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MemoryDetail memory={memory} timeZone="Asia/Ho_Chi_Minh" />);

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(await screen.findByLabelText("Nội dung"), {
      target: { value: "Bản nháp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    screen.getByRole("dialog");
    confirmSpy.mockRestore();
  });

  it("shows the update time in the account time zone", () => {
    // 11:00 UTC là 18:00 ở Việt Nam — không phụ thuộc múi giờ của máy chạy.
    render(<MemoryDetail memory={memory} timeZone="Asia/Ho_Chi_Minh" />);

    expect(screen.getByText(/Cập nhật .*18:00/)).toBeTruthy();
  });

  it("marks a trashed Memory", () => {
    render(
      <MemoryDetail
        memory={{
          ...memory,
          state: "TRASHED",
          trashedAt: "2026-08-15T10:00:00.000Z",
        }}
        timeZone="Asia/Ho_Chi_Minh"
      />,
    );

    expect(screen.getByText("Thùng rác")).toBeTruthy();

    expect(
      screen.queryByRole("button", {
        name: "Chỉnh sửa",
      }),
    ).toBeNull();
  });
});
