// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notifySuccess } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { ProjectOutcomeEditor } from "./project-outcome-editor";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ProjectOutcomeEditor", () => {
  it("invites the user to define an outcome when none exists yet", () => {
    render(
      <ProjectOutcomeEditor
        intendedOutcome={null}
        externalUpdateToken={0}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Chưa xác định outcome cho chu kỳ này."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Xác định" }),
    ).toBeInTheDocument();
  });

  it("shows the existing outcome with an edit affordance", () => {
    render(
      <ProjectOutcomeEditor
        intendedOutcome="Ship Projects V1"
        externalUpdateToken={0}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Ship Projects V1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa" })).toBeInTheDocument();
  });

  it("saves a new intended outcome through onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: "success" });

    render(
      <ProjectOutcomeEditor
        intendedOutcome={null}
        externalUpdateToken={0}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(
      screen.getByPlaceholderText(
        "Bạn muốn đạt được điều gì trong chu kỳ này?",
      ),
      { target: { value: "  Ship Projects V1  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("  Ship Projects V1  "),
    );
    expect(notifySuccess).toHaveBeenCalledWith("Đã cập nhật intended outcome");
  });

  it("disables Save while the draft is blank", () => {
    render(
      <ProjectOutcomeEditor
        intendedOutcome="Ship Projects V1"
        externalUpdateToken={0}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Ship Projects V1"), {
      target: { value: "   " },
    });

    expect(
      (screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("discards the draft and restores the read view on cancel", () => {
    const onSubmit = vi.fn();

    render(
      <ProjectOutcomeEditor
        intendedOutcome="Ship Projects V1"
        externalUpdateToken={0}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Ship Projects V1"), {
      target: { value: "Nội dung nháp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(screen.getByText("Ship Projects V1")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the error from onSubmit and keeps editing open on failure", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      status: "error",
      message: "Project đã thay đổi ở một phiên làm việc khác.",
    });

    render(
      <ProjectOutcomeEditor
        intendedOutcome="Ship Projects V1"
        externalUpdateToken={0}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ship Projects V1")).toBeInTheDocument();
  });

  it("closes the editor and discards the draft when externalUpdateToken changes", () => {
    const { rerender } = render(
      <ProjectOutcomeEditor
        intendedOutcome="Ship Projects V1"
        externalUpdateToken={0}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Ship Projects V1"), {
      target: { value: "Nội dung nháp chưa lưu" },
    });

    // Mô phỏng conflict-reload ở field khác khiến provider adopt project
    // mới — outcome mới từ server khác với draft đang gõ dở.
    rerender(
      <ProjectOutcomeEditor
        intendedOutcome="Outcome mới từ server"
        externalUpdateToken={1}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByDisplayValue("Nội dung nháp chưa lưu")).toBeNull();
    expect(screen.getByText("Outcome mới từ server")).toBeInTheDocument();
  });
});
