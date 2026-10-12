// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notifySuccess } = vi.hoisted(() => ({
  notifySuccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

// react-day-picker khó bấm trong jsdom — thay bằng một nút chọn sẵn ngày
// 31/10/2026 (giờ local, đúng như DayPicker trả về), đủ để kiểm phần
// chuyển đổi ngày và luồng lưu của editor.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    selected,
    onSelect,
  }: {
    selected?: Date;
    onSelect: (date: Date | undefined) => void;
  }) => (
    <div>
      <span data-testid="calendar-selected">
        {selected ? selected.toDateString() : "none"}
      </span>
      <button type="button" onClick={() => onSelect(new Date(2026, 9, 31))}>
        Chọn 31/10/2026
      </button>
      <button type="button" onClick={() => onSelect(undefined)}>
        Bỏ chọn trên lịch
      </button>
    </div>
  ),
}));

import { ProjectTargetEndEditor } from "./project-target-end-editor";

const onSubmit = vi.fn();
const onReload = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit.mockResolvedValue({ status: "success" });
});

afterEach(cleanup);

function renderEditor(targetEndAt: string | null, today = "2026-10-12") {
  return render(
    <ProjectTargetEndEditor
      targetEndAt={targetEndAt}
      today={today}
      onSubmit={onSubmit}
      onReload={onReload}
    />,
  );
}

describe("ProjectTargetEndEditor", () => {
  it("invites setting a date while none is set, without a clear button", () => {
    renderEditor(null);

    expect(screen.getByText("Chưa đặt ngày kết thúc dự kiến.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đặt ngày" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bỏ ngày" })).toBeNull();
  });

  it("shows the target date as a date-only value", () => {
    renderEditor("2026-10-31");

    const time = screen.getByText("31/10/2026");
    expect(time.getAttribute("dateTime")).toBe("2026-10-31");
    expect(screen.queryByText(/Quá hạn dự kiến/)).toBeNull();
  });

  it("is not overdue on the target day itself", () => {
    renderEditor("2026-10-12", "2026-10-12");

    expect(screen.queryByText(/Quá hạn dự kiến/)).toBeNull();
  });

  it("flags how many days the Cycle has run past its target", () => {
    renderEditor("2026-10-09", "2026-10-12");

    expect(screen.getByText("Quá hạn dự kiến 3 ngày")).toBeTruthy();
  });

  it("saves the picked calendar day as a date-only value", async () => {
    renderEditor(null);

    fireEvent.click(screen.getByRole("button", { name: "Đặt ngày" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Chọn 31/10/2026" }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("2026-10-31"));
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã đặt ngày dự kiến"),
    );
    expect(
      screen.queryByRole("button", { name: "Chọn 31/10/2026" }),
    ).toBeNull();
  });

  it("opens the calendar on the current target date", async () => {
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Đổi ngày" }));

    expect((await screen.findByTestId("calendar-selected")).textContent).toBe(
      new Date(2026, 9, 31).toDateString(),
    );
  });

  it("does not save when the same date is picked again", async () => {
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Đổi ngày" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Chọn 31/10/2026" }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes the calendar without saving when the selected day is clicked again", async () => {
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Đổi ngày" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Bỏ chọn trên lịch" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Bỏ chọn trên lịch" }),
      ).toBeNull(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("31/10/2026")).toBeTruthy();
  });

  it("clears the target date", async () => {
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ngày" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(null));
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith("Đã bỏ ngày dự kiến"),
    );
  });

  it("shows the error and offers to reload on a revision conflict", async () => {
    onSubmit.mockResolvedValue({
      status: "error",
      message: "Project đã thay đổi ở một phiên làm việc khác.",
      hasConflict: true,
    });
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ngày" }));

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Tải bản mới nhất/ }));

    expect(onReload).toHaveBeenCalledOnce();
    expect(
      screen.queryByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeNull();
  });

  it("stays quiet when the save went stale behind an external update", async () => {
    onSubmit.mockResolvedValue({ status: "stale" });
    renderEditor("2026-10-31");

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ngày" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
