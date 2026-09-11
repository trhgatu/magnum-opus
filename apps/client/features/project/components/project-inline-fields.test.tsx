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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeProjectLifecycle,
  updateProject,
} from "@/features/project/actions/project";
import {
  ProjectFieldsProvider,
  ProjectInlineDescription,
  ProjectInlineTitle,
  ProjectLifecycleControlsInline,
} from "./project-inline-fields";

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

vi.mock("@/features/project/actions/project", () => ({
  updateProject: vi.fn(),
  changeProjectLifecycle: vi.fn(),
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

describe("ProjectInlineTitle", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("saves the trimmed title on blur", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
    });

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    const input = screen.getByLabelText("Tên Project");
    fireEvent.change(input, { target: { value: "  Ra mắt sản phẩm mới  " } });
    blurElement(input);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith({
      id: baseProject.id,
      expectedRevision: baseProject.revision,
      title: "Ra mắt sản phẩm mới",
      description: null,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("cancels on Escape without saving", () => {
    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    const input = screen.getByLabelText("Tên Project");
    fireEvent.change(input, { target: { value: "Something else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.getByRole("button", { name: /Ra mắt sản phẩm/ }),
    ).toBeTruthy();
    expect(mutation).not.toHaveBeenCalled();
  });

  it("does not save an empty title", () => {
    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    const input = screen.getByLabelText("Tên Project");
    fireEvent.change(input, { target: { value: "   " } });
    blurElement(input);

    expect(mutation).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Ra mắt sản phẩm/ }),
    ).toBeTruthy();
  });

  it("shows a reload affordance on a revision conflict, and clears it once dismissed via Escape", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    const input = screen.getByLabelText("Tên Project");
    fireEvent.change(input, { target: { value: "Ra mắt phiên bản 2" } });
    blurElement(input);

    await waitFor(() =>
      expect(
        screen.getByText("Project đã thay đổi ở một phiên làm việc khác."),
      ).toBeTruthy(),
    );

    // Escape hủy sửa — lỗi cũ không được sống sót sang lần mở sửa kế tiếp.
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    expect(
      screen.queryByText("Project đã thay đổi ở một phiên làm việc khác."),
    ).toBeNull();
  });

  it("clicking the reload affordance refreshes without saving the stale draft again", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "conflict",
      code: "PROJECT_REVISION_CONFLICT",
    });

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    const input = screen.getByLabelText("Tên Project");
    fireEvent.change(input, { target: { value: "Ra mắt phiên bản 2" } });
    blurElement(input);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Tải bản mới nhất" }));
    expect(refresh).toHaveBeenCalledOnce();
    // mousedown trên nút reload chặn blur của input, nên không có lần lưu
    // thứ hai với cùng revision đã xung đột.
    expect(mutation).toHaveBeenCalledOnce();
  });
});

describe("ProjectInlineDescription", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("shows the placeholder and saves a new description", async () => {
    mutation.mockResolvedValue({
      status: "success",
      project: { ...baseProject, description: "Vì lý do chiến lược." },
    });

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    const textarea = screen.getByLabelText("Mô tả Project");
    fireEvent.change(textarea, {
      target: { value: "Vì lý do chiến lược." },
    });
    blurElement(textarea);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith({
      id: baseProject.id,
      expectedRevision: baseProject.revision,
      title: baseProject.title,
      description: "Vì lý do chiến lược.",
    });
  });

  it("clearing the description down to blank saves null", async () => {
    const projectWithDescription = { ...baseProject, description: "Cũ" };
    mutation.mockResolvedValue({
      status: "success",
      project: { ...projectWithDescription, description: null },
    });

    render(
      <ProjectFieldsProvider initialProject={projectWithDescription}>
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cũ/ }));
    const textarea = screen.getByLabelText("Mô tả Project");
    fireEvent.change(textarea, { target: { value: "   " } });
    blurElement(textarea);

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });
});

describe("ProjectFieldsProvider sharing state across title and description", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("uses the revision from a successful title save when the description is saved right after", async () => {
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

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả Project"), {
      target: { value: "Vì lý do chiến lược." },
    });
    blurElement(screen.getByLabelText("Mô tả Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));

    // Field thứ hai phải dùng revision 4 (kết quả của lần lưu đầu), không
    // phải revision 3 ban đầu — nếu không sẽ luôn bị 409.
    expect(mutation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });

  it("queues a truly concurrent save behind the in-flight one and merges in its result", async () => {
    let resolveFirst!: (
      value: Awaited<ReturnType<typeof updateProject>>,
    ) => void;
    const firstCall = new Promise<Awaited<ReturnType<typeof updateProject>>>(
      (resolve) => {
        resolveFirst = resolve;
      },
    );
    mutation.mockImplementationOnce(() => firstCall);
    mutation.mockResolvedValueOnce({
      status: "success",
      project: {
        ...baseProject,
        title: "Ra mắt sản phẩm mới",
        description: "Vì lý do chiến lược.",
        revision: 5,
      },
    });

    render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Sửa title trước — request đầu tiên cố tình chưa resolve.
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    // Sửa description ngay lập tức, trước khi request title kịp resolve —
    // đây là trường hợp đồng thời thật sự, không phải tuần tự. Request thứ
    // hai bị xếp hàng phía sau (chưa resolve firstCall) nên vẫn chưa được
    // gửi đi lúc này — chỉ có thể xác nhận gián tiếp qua revision nó dùng
    // ở assertion cuối, vì chờ "chưa gọi lần 2" một cách đáng tin cậy giữa
    // hai microtask là không ổn định.
    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả Project"), {
      target: { value: "Vì lý do chiến lược." },
    });
    blurElement(screen.getByLabelText("Mô tả Project"));

    resolveFirst({
      status: "success",
      project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
    });

    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));
    // Request thứ hai phải mang theo revision 4 (từ kết quả request đầu)
    // và title mới (không phải title cũ mà field description đã đóng gói
    // lúc component còn chưa re-render).
    expect(mutation).toHaveBeenNthCalledWith(2, {
      id: baseProject.id,
      expectedRevision: 4,
      title: "Ra mắt sản phẩm mới",
      description: "Vì lý do chiến lược.",
    });
  });
});

describe("ProjectLifecycleControlsInline", () => {
  beforeEach(() => {
    mutation.mockReset();
    lifecycleMutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("runs a lifecycle action using the revision from a just-completed inline save, not the initial prop", async () => {
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
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectLifecycleControlsInline />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    // NOT_STARTED -> "start" không cần dialog xác nhận.
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));

    await waitFor(() => expect(lifecycleMutation).toHaveBeenCalledOnce());
    expect(lifecycleMutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});
