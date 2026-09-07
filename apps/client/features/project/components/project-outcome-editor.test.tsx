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

const { setProjectIntendedOutcome, refresh, notifySuccess } = vi.hoisted(
  () => ({
    setProjectIntendedOutcome: vi.fn(),
    refresh: vi.fn(),
    notifySuccess: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/features/project/actions/project", () => ({
  setProjectIntendedOutcome,
}));

vi.mock("@/lib/toast", () => ({ notifySuccess }));

import { ProjectOutcomeEditor } from "./project-outcome-editor";

const projectId = "72b45d9d-7ac6-4ec8-b3bc-5d67134b9676";
const revision = 2;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("ProjectOutcomeEditor", () => {
  it("invites the user to define an outcome when none exists yet", () => {
    render(
      <ProjectOutcomeEditor
        id={projectId}
        revision={revision}
        intendedOutcome={null}
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
        id={projectId}
        revision={revision}
        intendedOutcome="Ship Projects V1"
      />,
    );

    expect(screen.getByText("Ship Projects V1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sửa" })).toBeInTheDocument();
  });

  it("saves a new intended outcome", async () => {
    setProjectIntendedOutcome.mockResolvedValue({
      status: "success",
      project: {},
    });

    render(
      <ProjectOutcomeEditor
        id={projectId}
        revision={revision}
        intendedOutcome={null}
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
      expect(setProjectIntendedOutcome).toHaveBeenCalledWith({
        id: projectId,
        intendedOutcome: "  Ship Projects V1  ",
        expectedRevision: revision,
      }),
    );

    expect(notifySuccess).toHaveBeenCalledWith("Đã cập nhật intended outcome");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("disables Save while the draft is blank", () => {
    render(
      <ProjectOutcomeEditor
        id={projectId}
        revision={revision}
        intendedOutcome="Ship Projects V1"
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
    render(
      <ProjectOutcomeEditor
        id={projectId}
        revision={revision}
        intendedOutcome="Ship Projects V1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Ship Projects V1"), {
      target: { value: "Nội dung nháp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(screen.getByText("Ship Projects V1")).toBeInTheDocument();
    expect(setProjectIntendedOutcome).not.toHaveBeenCalled();
  });

  it("shows the server error and keeps editing open on failure", async () => {
    setProjectIntendedOutcome.mockResolvedValue({
      status: "error",
      message: "Project đã thay đổi ở một phiên làm việc khác.",
      code: "PROJECT_REVISION_CONFLICT",
    });

    render(
      <ProjectOutcomeEditor
        id={projectId}
        revision={revision}
        intendedOutcome="Ship Projects V1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeInTheDocument();

    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Ship Projects V1")).toBeInTheDocument();
  });
});
