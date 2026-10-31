// @vitest-environment jsdom

import type { ProjectResponse } from "@repo/contracts";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeProjectLifecycle,
  setProjectIntendedOutcome,
  setProjectTargetEndDate,
  updateProject,
} from "@/features/project/actions/project";
import { notifySuccess } from "@/lib/toast";

import {
  ProjectDetailDescription,
  ProjectDetailTitle,
  ProjectEditAction,
  ProjectFieldsProvider,
  ProjectLifecycleControlsInline,
  ProjectOutcomeEditorInline,
  ProjectTargetEndEditorInline,
} from "./project-inline-fields";

vi.mock("@/features/project/actions/project", () => ({
  updateProject: vi.fn(),
  changeProjectLifecycle: vi.fn(),
  setProjectIntendedOutcome: vi.fn(),
  setProjectTargetEndDate: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  notifySuccess: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(updateProject);
const lifecycleMutation = vi.mocked(changeProjectLifecycle);
const outcomeMutation = vi.mocked(setProjectIntendedOutcome);
const targetEndMutation = vi.mocked(setProjectTargetEndDate);

const baseProject: ProjectResponse = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Ra mắt sản phẩm",
  description: null,
  lifecycleState: "NOT_STARTED",
  currentCycle: null,
  revision: 3,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

/** Phần đầu trang chi tiết: tên, mô tả và nút Chỉnh sửa, cộng phần còn lại
 * của trang cần cho từng test. */
function Details({
  project,
  children,
}: {
  project: ProjectResponse;
  children?: ReactNode;
}) {
  return (
    <ProjectFieldsProvider initialProject={project}>
      <h1>
        <ProjectDetailTitle />
      </h1>
      <p>
        <ProjectDetailDescription placeholder="Chưa có mô tả cho effort này." />
      </p>
      <ProjectEditAction />
      {children}
    </ProjectFieldsProvider>
  );
}

// Khi sheet mở, phần trang phía sau bị ẩn với trình đọc màn hình nên không
// tìm được bằng role; đọc thẳng nội dung tiêu đề.
const heading = () => document.querySelector("h1")?.textContent;

function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
}

function fillSheet(fields: { title?: string; description?: string }) {
  if (fields.title !== undefined) {
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: fields.title },
    });
  }
  if (fields.description !== undefined) {
    fireEvent.change(screen.getByLabelText("Mô tả (tùy chọn)"), {
      target: { value: fields.description },
    });
  }
}

function saveInSheet(fields: { title?: string; description?: string }) {
  openSheet();
  fillSheet(fields);
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
}

describe("ProjectEditAction", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
    vi.mocked(notifySuccess).mockReset();
  });

  afterEach(cleanup);

  it("shows the title and description as plain text", () => {
    render(<Details project={baseProject} />);

    expect(
      screen.getByRole("heading", { name: "Ra mắt sản phẩm" }),
    ).toBeTruthy();
    expect(screen.getByText("Chưa có mô tả cho effort này.")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Ra mắt sản phẩm/ }),
    ).toBeNull();
  });

  it("saves the trimmed title and description from the sheet, then closes it", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: {
        ...baseProject,
        title: "Ra mắt sản phẩm mới",
        description: "Vì lý do chiến lược.",
        revision: 4,
      },
    });
    render(<Details project={baseProject} />);

    openSheet();
    expect(document.activeElement).toBe(screen.getByLabelText("Tên Project"));
    fillSheet({
      title: "  Ra mắt sản phẩm mới  ",
      description: " Vì lý do chiến lược. ",
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mutation).toHaveBeenCalledWith({
      id: baseProject.id,
      expectedRevision: baseProject.revision,
      title: "Ra mắt sản phẩm mới",
      description: "Vì lý do chiến lược.",
    });
    expect(heading()).toBe("Ra mắt sản phẩm mới");
    expect(screen.getByText("Vì lý do chiến lược.")).toBeTruthy();
    expect(refresh).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith(
      'Đã cập nhật "Ra mắt sản phẩm mới"',
    );
  });

  it("saves null when the description is cleared down to blank", async () => {
    const projectWithDescription = { ...baseProject, description: "Cũ" };
    mutation.mockResolvedValue({
      status: "success",
      project: { ...projectWithDescription, description: null, revision: 4 },
    });
    render(<Details project={projectWithDescription} />);

    saveInSheet({ description: "   " });

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });

  it("does not save a blank title", () => {
    render(<Details project={baseProject} />);

    openSheet();
    fillSheet({ title: "   " });
    fireEvent.submit(
      screen.getByRole("button", { name: "Lưu thay đổi" }).closest("form")!,
    );

    expect(mutation).not.toHaveBeenCalled();
    screen.getByRole("dialog");
  });

  it("closes without saving when nothing changed", () => {
    render(<Details project={baseProject} />);

    saveInSheet({});

    expect(mutation).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before throwing away unsaved changes", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Details project={baseProject} />);

    openSheet();
    fillSheet({ title: "Bản nháp" });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(confirmSpy).toHaveBeenCalledOnce();
    screen.getByRole("dialog");

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    confirmSpy.mockRestore();
  });

  it("offers to reload on a revision conflict without saving the stale draft again", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });
    render(<Details project={baseProject} />);

    saveInSheet({ title: "Ra mắt phiên bản 2" });

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(mutation).toHaveBeenCalledOnce();
  });
});

describe("ProjectFieldsProvider sharing state", () => {
  beforeEach(() => {
    mutation.mockReset();
    lifecycleMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("uses the revision from the previous save when the sheet is saved again", async () => {
    mutation
      .mockResolvedValueOnce({
        status: "success",
        project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
      })
      .mockResolvedValueOnce({
        status: "success",
        project: {
          ...baseProject,
          title: "Ra mắt sản phẩm mới",
          description: "Vì lý do chiến lược.",
          revision: 5,
        },
      });
    render(<Details project={baseProject} />);

    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    saveInSheet({ description: "Vì lý do chiến lược." });
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));

    // Lần thứ hai phải dùng revision 4 (kết quả của lần lưu đầu), không
    // phải revision 3 ban đầu — nếu không sẽ luôn bị 409.
    expect(mutation).toHaveBeenNthCalledWith(2, {
      id: baseProject.id,
      expectedRevision: 4,
      title: "Ra mắt sản phẩm mới",
      description: "Vì lý do chiến lược.",
    });
  });

  it("runs a lifecycle action using the revision from a just-completed save, not the initial prop", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
    });
    lifecycleMutation.mockResolvedValue({
      status: "success",
      project: {
        ...baseProject,
        title: "Ra mắt sản phẩm mới",
        lifecycleState: "ACTIVE",
      },
    });
    render(
      <Details project={baseProject}>
        <ProjectLifecycleControlsInline />
      </Details>,
    );

    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // NOT_STARTED -> "start" không cần dialog xác nhận.
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));

    await waitFor(() => expect(lifecycleMutation).toHaveBeenCalledOnce());
    expect(lifecycleMutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});

describe("ProjectFieldsProvider re-render behavior (no key-based remount)", () => {
  beforeEach(() => {
    mutation.mockReset();
    outcomeMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  const projectWithCycle: ProjectResponse = {
    ...baseProject,
    lifecycleState: "ACTIVE",
    currentCycle: {
      id: "cycle-1",
      cycleNumber: 1,
      intendedOutcome: null,
      outcomeHistory: [],
      targetEndAt: null,
      closingNote: null,
      startedAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      endReason: null,
    },
  };

  it("keeps a draft in the sheet when the page re-renders with the revision it already has", async () => {
    // Phải đi qua đúng đường lưu thật (không tự bịa prop revision mới) —
    // nếu không, test không phân biệt được "vừa tự lưu xong" với "có cập
    // nhật từ bên ngoài", hai case có hành vi khác nhau.
    mutation.mockResolvedValue({
      status: "success",
      project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
    });
    const { rerender } = render(<Details project={baseProject} />);

    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    openSheet();
    fillSheet({ description: "Bản nháp chưa lưu" });

    // router.refresh() của lần lưu trước về muộn: cha re-render với đúng
    // revision 4 — không mới hơn bản đã có, không phải cập nhật từ ngoài.
    rerender(
      <Details
        project={{ ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 }}
      />,
    );

    expect(
      (screen.getByLabelText("Mô tả (tùy chọn)") as HTMLTextAreaElement).value,
    ).toBe("Bản nháp chưa lưu");
  });

  it("drops the draft and shows the latest values when an external update lands while the sheet is open", () => {
    const { rerender } = render(<Details project={baseProject} />);

    openSheet();
    fillSheet({ description: "Bản nháp chưa lưu" });

    // Cập nhật từ bên ngoài (vd "Tải bản mới nhất" sau xung đột) — revision
    // nhảy lên mà KHÔNG qua lần lưu cục bộ nào.
    rerender(
      <Details
        project={{
          ...baseProject,
          description: "Mô tả mới từ server",
          revision: 6,
        }}
      />,
    );

    // Không lỡ gửi bản nháp cũ đè lên dữ liệu vừa tải về.
    expect(
      (screen.getByLabelText("Mô tả (tùy chọn)") as HTMLTextAreaElement).value,
    ).toBe("Mô tả mới từ server");
    screen.getByRole("dialog");
  });

  it("never dispatches a sheet save that went stale while queued behind an in-flight outcome save", async () => {
    let resolveOutcomeSave!: (
      value: Awaited<ReturnType<typeof setProjectIntendedOutcome>>,
    ) => void;
    const outcomeSave = new Promise<
      Awaited<ReturnType<typeof setProjectIntendedOutcome>>
    >((resolve) => {
      resolveOutcomeSave = resolve;
    });
    outcomeMutation.mockImplementationOnce(() => outcomeSave);

    const { rerender } = render(
      <Details project={projectWithCycle}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </Details>,
    );

    // Outcome lưu trước — cố tình chưa resolve, giữ chỗ đầu hàng đợi.
    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledTimes(1));

    // Lưu trong sheet — xếp hàng SAU outcome, chưa thật sự gửi đi.
    saveInSheet({ title: "Ra mắt sản phẩm mới" });

    // Trong lúc cả hai vẫn chờ, có cập nhật từ bên ngoài (vd tab khác).
    rerender(
      <Details
        project={{ ...projectWithCycle, title: "Đổi từ tab khác", revision: 9 }}
      >
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </Details>,
    );

    await act(async () => {
      resolveOutcomeSave({
        status: "success",
        project: {
          ...projectWithCycle,
          currentCycle: {
            ...projectWithCycle.currentCycle!,
            intendedOutcome: "Ra mắt bản beta",
          },
          revision: 4,
        },
      });
      await outcomeSave;
    });

    // router.refresh() là hành động cuối của nhánh thành công của outcome —
    // dùng làm tín hiệu nó đã chạy xong.
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    // Lần lưu của sheet phải tự phát hiện đã lỗi thời ngay trước khi gửi.
    expect(mutation).not.toHaveBeenCalled();
  });

  it("does not let an in-flight save's result regress shared state once an external update has landed", async () => {
    let resolveTitleSave!: (
      value: Awaited<ReturnType<typeof updateProject>>,
    ) => void;
    const titleSave = new Promise<Awaited<ReturnType<typeof updateProject>>>(
      (resolve) => {
        resolveTitleSave = resolve;
      },
    );
    mutation.mockImplementationOnce(() => titleSave);
    const { rerender } = render(<Details project={baseProject} />);

    // Request đã thật sự gửi đi (không còn trong hàng đợi).
    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    // Cập nhật từ bên ngoài đến TRONG LÚC request đang bay.
    rerender(
      <Details
        project={{ ...baseProject, title: "Đổi từ tab khác", revision: 9 }}
      />,
    );
    expect(heading()).toBe("Đổi từ tab khác");

    await act(async () => {
      resolveTitleSave({
        status: "success",
        project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
      });
      await titleSave;
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());

    // Không thụt lùi về revision 4.
    expect(heading()).toBe("Đổi từ tab khác");
  });

  it("adopts a newer project from the parent when the revision has advanced without a local save", () => {
    const { rerender } = render(<Details project={baseProject} />);
    expect(heading()).toBe("Ra mắt sản phẩm");

    rerender(
      <Details
        project={{ ...baseProject, title: "Đổi từ nơi khác", revision: 5 }}
      />,
    );

    expect(heading()).toBe("Đổi từ nơi khác");
  });
});

describe("ProjectOutcomeEditorInline", () => {
  beforeEach(() => {
    mutation.mockReset();
    outcomeMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  const projectWithCycle: ProjectResponse = {
    ...baseProject,
    lifecycleState: "ACTIVE",
    currentCycle: {
      id: "cycle-1",
      cycleNumber: 1,
      intendedOutcome: null,
      outcomeHistory: [],
      targetEndAt: null,
      closingNote: null,
      startedAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      endReason: null,
    },
  };

  it("submits using the revision from a just-completed sheet save, not the initial prop", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithCycle,
        title: "Ra mắt sản phẩm mới",
        revision: 4,
      },
    });
    outcomeMutation.mockResolvedValue({
      status: "success",
      project: projectWithCycle,
    });

    render(
      <Details project={projectWithCycle}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </Details>,
    );

    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta cho 100 người dùng đầu tiên" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledOnce());
    expect(outcomeMutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });

  it("shows the outcome history from the shared project, updated by its own save", async () => {
    const firstSet = {
      outcome: "Ra mắt bản beta",
      setAt: "2026-08-02T00:00:00.000Z",
    };
    const withOneOutcome: ProjectResponse = {
      ...projectWithCycle,
      currentCycle: {
        ...projectWithCycle.currentCycle!,
        intendedOutcome: firstSet.outcome,
        outcomeHistory: [firstSet],
      },
    };
    outcomeMutation.mockResolvedValue({
      status: "success",
      project: {
        ...withOneOutcome,
        currentCycle: {
          ...withOneOutcome.currentCycle!,
          intendedOutcome: "Ra mắt bản chính thức",
          outcomeHistory: [
            firstSet,
            {
              outcome: "Ra mắt bản chính thức",
              setAt: "2026-08-10T00:00:00.000Z",
            },
          ],
        },
        revision: 4,
      },
    });

    render(
      <ProjectFieldsProvider initialProject={withOneOutcome}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </ProjectFieldsProvider>,
    );

    // Một outcome duy nhất — chưa có gì để gọi là "lịch sử".
    expect(screen.queryByText(/Lịch sử outcome/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản chính thức" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(await screen.findByText("Lịch sử outcome (2 lần đặt)")).toBeTruthy();
  });

  it("renders nothing when the project has no current cycle", () => {
    const { container } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </ProjectFieldsProvider>,
    );

    expect(container.textContent).toBe("");
  });

  it("bumps the shared revision after its own save, so a sheet save right after doesn't send a stale revision", async () => {
    outcomeMutation.mockResolvedValue({
      status: "success",
      project: { ...projectWithCycle, revision: 4 },
    });
    mutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithCycle,
        title: "Ra mắt sản phẩm mới",
        revision: 5,
      },
    });

    render(
      <Details project={projectWithCycle}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </Details>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta cho 100 người dùng đầu tiên" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledOnce());

    saveInSheet({ title: "Ra mắt sản phẩm mới" });

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });

  it("queues a sheet save behind an in-flight outcome save through the same runExclusive queue", async () => {
    let resolveOutcomeSave!: (
      value: Awaited<ReturnType<typeof setProjectIntendedOutcome>>,
    ) => void;
    const outcomeSave = new Promise<
      Awaited<ReturnType<typeof setProjectIntendedOutcome>>
    >((resolve) => {
      resolveOutcomeSave = resolve;
    });
    outcomeMutation.mockImplementationOnce(() => outcomeSave);
    mutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithCycle,
        title: "Ra mắt sản phẩm mới",
        revision: 5,
      },
    });

    render(
      <Details project={projectWithCycle}>
        <ProjectOutcomeEditorInline timeZone="UTC" />
      </Details>,
    );

    // Outcome bắt đầu lưu — cố tình chưa resolve.
    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta cho 100 người dùng đầu tiên" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledOnce());

    // Lưu trong sheet khi outcome vẫn đang chờ — phải xếp hàng sau outcome
    // qua cùng `runExclusive`, không được gửi song song với revision cũ.
    saveInSheet({ title: "Ra mắt sản phẩm mới" });

    resolveOutcomeSave({
      status: "success",
      project: { ...projectWithCycle, revision: 4 },
    });

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});

describe("ProjectTargetEndEditorInline", () => {
  beforeEach(() => {
    mutation.mockReset();
    targetEndMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  const projectWithTarget: ProjectResponse = {
    ...baseProject,
    lifecycleState: "ACTIVE",
    currentCycle: {
      id: "cycle-1",
      cycleNumber: 1,
      intendedOutcome: null,
      outcomeHistory: [],
      targetEndAt: "2026-08-20",
      closingNote: null,
      startedAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      endReason: null,
    },
  };

  it("clears the date using the revision from a just-completed sheet save", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithTarget,
        title: "Ra mắt sản phẩm mới",
        revision: 4,
      },
    });
    targetEndMutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithTarget,
        currentCycle: { ...projectWithTarget.currentCycle!, targetEndAt: null },
        revision: 5,
      },
    });

    render(
      <Details project={projectWithTarget}>
        <ProjectTargetEndEditorInline today="2026-08-25" />
      </Details>,
    );

    expect(screen.getByText("Quá hạn dự kiến 5 ngày")).toBeTruthy();

    saveInSheet({ title: "Ra mắt sản phẩm mới" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ngày" }));

    await waitFor(() =>
      expect(targetEndMutation).toHaveBeenCalledWith({
        id: projectWithTarget.id,
        targetEndAt: null,
        expectedRevision: 4,
      }),
    );
    // Project dùng chung đã nhận kết quả — nhãn quá hạn biến mất ngay.
    expect(
      await screen.findByText("Chưa đặt ngày kết thúc dự kiến."),
    ).toBeTruthy();
    expect(screen.queryByText(/Quá hạn dự kiến/)).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it("maps a revision conflict to the shared conflict message", async () => {
    targetEndMutation.mockResolvedValue({
      status: "error",
      code: "PROJECT_REVISION_CONFLICT",
      message: "Conflict",
    });

    render(
      <ProjectFieldsProvider initialProject={projectWithTarget}>
        <ProjectTargetEndEditorInline today="2026-08-25" />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ngày" }));

    expect(
      await screen.findByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tải bản mới nhất" }),
    ).toBeTruthy();
  });

  it("renders nothing when the project has no current cycle", () => {
    const { container } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectTargetEndEditorInline today="2026-08-25" />
      </ProjectFieldsProvider>,
    );

    expect(container.textContent).toBe("");
  });
});
