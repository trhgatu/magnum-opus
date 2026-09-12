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
  setProjectIntendedOutcome,
  updateProject,
} from "@/features/project/actions/project";
import {
  ProjectFieldsProvider,
  ProjectInlineDescription,
  ProjectInlineTitle,
  ProjectLifecycleControlsInline,
  ProjectOutcomeEditorInline,
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
  setProjectIntendedOutcome: vi.fn(),
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

describe("ProjectFieldsProvider re-render behavior (no key-based remount)", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("keeps an in-progress edit in one field after the sibling field's own save lands and the parent re-renders with the matching revision", async () => {
    // Phải đi qua đúng đường lưu thật (không tự bịa prop revision mới) —
    // nếu không, test không phân biệt được "field kia vừa tự lưu xong"
    // với "có cập nhật từ bên ngoài", hai case có hành vi khác nhau sau
    // khi thêm externalUpdateToken (case sau phải tự đóng editor).
    mutation.mockResolvedValue({
      status: "success",
      project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
    });

    const { rerender } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Title tự lưu thành công trước — context đã có revision 4 ngay lập
    // tức (qua setProject bên trong commit, không qua externalUpdateToken).
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    // Bắt đầu sửa description SAU khi title đã lưu xong, và không đụng gì
    // tới nó nữa — nó vẫn là phần tử đang thật sự giữ focus của jsdom khi
    // router.refresh() (mô phỏng ở rerender bên dưới) đến, đúng kịch bản
    // "router.refresh() của title về muộn trong lúc user đã chuyển sang
    // gõ description".
    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả Project"), {
      target: { value: "Bản nháp chưa lưu" },
    });

    // router.refresh() sau đó khiến Server Component cha re-render với
    // đúng revision 4 (không mới hơn state cục bộ đã có) — không được
    // coi là cập nhật từ bên ngoài, description vẫn giữ nguyên draft.
    rerender(
      <ProjectFieldsProvider
        initialProject={{
          ...baseProject,
          title: "Ra mắt sản phẩm mới",
          revision: 4,
        }}
      >
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    expect(
      (screen.getByLabelText("Mô tả Project") as HTMLTextAreaElement).value,
    ).toBe("Bản nháp chưa lưu");
  });

  it("closes an in-progress edit in the sibling field when the parent delivers a project from an external update", () => {
    const { rerender } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Bắt đầu sửa description, chưa blur/lưu.
    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả Project"), {
      target: { value: "Bản nháp chưa lưu" },
    });

    // Cập nhật đến từ bên ngoài (vd "Tải bản mới nhất" sau conflict ở
    // field khác) — revision nhảy lên mà KHÔNG qua commit cục bộ nào.
    rerender(
      <ProjectFieldsProvider
        initialProject={{
          ...baseProject,
          description: "Mô tả mới từ server",
          revision: 6,
        }}
      >
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Editor phải tự đóng lại, không còn hiện draft cũ — nếu không, blur
    // sau đó sẽ gửi draft cũ đè lên "Mô tả mới từ server" vừa tải về.
    expect(screen.queryByLabelText("Mô tả Project")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Mô tả mới từ server/ }),
    ).toBeTruthy();
  });

  it("never dispatches a commit that went stale while queued behind an in-flight sibling save", async () => {
    let resolveDescriptionSave!: (
      value: Awaited<ReturnType<typeof updateProject>>,
    ) => void;
    const descriptionSave = new Promise<
      Awaited<ReturnType<typeof updateProject>>
    >((resolve) => {
      resolveDescriptionSave = resolve;
    });
    mutation.mockImplementationOnce(() => descriptionSave);

    const { rerender } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Description bắt đầu lưu trước — cố tình chưa resolve, giữ chỗ đầu
    // hàng đợi runExclusive.
    fireEvent.click(screen.getByRole("button", { name: /Chưa có mô tả/ }));
    fireEvent.change(screen.getByLabelText("Mô tả Project"), {
      target: { value: "Mô tả đang lưu" },
    });
    blurElement(screen.getByLabelText("Mô tả Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));

    // Title sửa xong, blur — commit của nó bị xếp hàng SAU description,
    // chưa thật sự gửi đi lúc này.
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));

    // Trong lúc cả hai vẫn chờ, có cập nhật từ bên ngoài (vd tab khác) —
    // parent re-render với revision cao hơn hẳn, không liên quan tới commit
    // nào đang xếp hàng.
    rerender(
      <ProjectFieldsProvider
        initialProject={{
          ...baseProject,
          title: "Đổi từ tab khác",
          revision: 9,
        }}
      >
        <ProjectInlineTitle />
        <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
      </ProjectFieldsProvider>,
    );

    // Description's request (đã thật sự gửi trước khi có update từ bên
    // ngoài) giờ mới resolve — cho phép title's queued task tới lượt chạy.
    // Bọc trong `act` vì việc resolve này kéo theo state update (của cả
    // description's onSettled lẫn title's stale-check) xảy ra ngoài một
    // sự kiện fireEvent thông thường.
    await act(async () => {
      resolveDescriptionSave({
        status: "success",
        project: {
          ...baseProject,
          description: "Mô tả đang lưu",
          revision: 4,
        },
      });
      // Để promise chain của runExclusive (description → title) chạy hết
      // trong cùng lượt act này, không phụ thuộc số lượt microtask cụ thể.
      await descriptionSave;
    });

    // router.refresh() là hành động cuối cùng, đồng bộ, của NHÁNH thành
    // công (dù không áp state — xem "state không thụt lùi..." bên dưới) —
    // dùng nó làm tín hiệu xác định description's continuation đã chạy
    // xong, thay vì đoán số lượt sleep(0).
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    // Title's commit phải tự phát hiện đã lỗi thời ngay trước khi gửi —
    // updateProject chỉ được gọi đúng 1 lần (của description), không có
    // lần gọi thứ hai cho title dùng draft đã bị bỏ.
    expect(mutation).toHaveBeenCalledTimes(1);
  });

  it("does not let an in-flight commit's result regress shared state once an external update has landed", async () => {
    let resolveTitleSave!: (
      value: Awaited<ReturnType<typeof updateProject>>,
    ) => void;
    const titleSave = new Promise<Awaited<ReturnType<typeof updateProject>>>(
      (resolve) => {
        resolveTitleSave = resolve;
      },
    );
    mutation.mockImplementationOnce(() => titleSave);

    const { rerender } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    // Title bắt đầu lưu — cố tình chưa resolve, request đã thật sự dispatch
    // (không còn nằm trong hàng đợi nữa).
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    // Có cập nhật từ bên ngoài đến TRONG LÚC request trên đang bay —
    // revision nhảy hẳn lên 9, cao hơn bất kỳ điều title's response sắp
    // trả về.
    rerender(
      <ProjectFieldsProvider
        initialProject={{
          ...baseProject,
          title: "Đổi từ tab khác",
          revision: 9,
        }}
      >
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Đổi từ tab khác" }),
    ).toBeTruthy();

    // Request của title giờ mới resolve — phản ánh revision 4, CŨ hơn
    // revision 9 vừa được adopt từ bên ngoài.
    await act(async () => {
      resolveTitleSave({
        status: "success",
        project: { ...baseProject, title: "Ra mắt sản phẩm mới", revision: 4 },
      });
      await titleSave;
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());

    // State dùng chung không được thụt lùi về revision 4 — vẫn phải giữ
    // "Đổi từ tab khác" (revision 9) đã biết là mới hơn.
    expect(
      screen.getByRole("button", { name: "Đổi từ tab khác" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Ra mắt sản phẩm mới" }),
    ).toBeNull();
  });

  it("adopts a newer project from the parent when the revision has advanced without a local save", () => {
    const { rerender } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    expect(
      screen.getByRole("button", { name: /Ra mắt sản phẩm$/ }),
    ).toBeTruthy();

    // Mô phỏng "Tải bản mới nhất" sau conflict: router.refresh() lấy về
    // project mới nhất từ server, revision nhảy hẳn lên (không phải do
    // chính field này tự lưu).
    rerender(
      <ProjectFieldsProvider
        initialProject={{
          ...baseProject,
          title: "Đổi từ nơi khác",
          revision: 5,
        }}
      >
        <ProjectInlineTitle />
      </ProjectFieldsProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Đổi từ nơi khác" }),
    ).toBeTruthy();
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
      startedAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      endReason: null,
    },
  };

  it("submits using the revision from a just-completed inline save, not the initial prop", async () => {
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
      <ProjectFieldsProvider initialProject={projectWithCycle}>
        <ProjectInlineTitle />
        <ProjectOutcomeEditorInline />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

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

  it("renders nothing when the project has no current cycle", () => {
    const { container } = render(
      <ProjectFieldsProvider initialProject={baseProject}>
        <ProjectOutcomeEditorInline />
      </ProjectFieldsProvider>,
    );

    expect(container.textContent).toBe("");
  });

  it("bumps the shared revision after its own save, so a title save right after doesn't send a stale revision", async () => {
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
      <ProjectFieldsProvider initialProject={projectWithCycle}>
        <ProjectInlineTitle />
        <ProjectOutcomeEditorInline />
      </ProjectFieldsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta cho 100 người dùng đầu tiên" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));

    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });

  it("queues a concurrent outcome save behind an in-flight title save through the same runExclusive queue", async () => {
    let resolveTitleSave!: (
      value: Awaited<ReturnType<typeof updateProject>>,
    ) => void;
    const titleSave = new Promise<Awaited<ReturnType<typeof updateProject>>>(
      (resolve) => {
        resolveTitleSave = resolve;
      },
    );
    mutation.mockImplementationOnce(() => titleSave);
    outcomeMutation.mockResolvedValue({
      status: "success",
      project: {
        ...projectWithCycle,
        title: "Ra mắt sản phẩm mới",
        revision: 5,
      },
    });

    render(
      <ProjectFieldsProvider initialProject={projectWithCycle}>
        <ProjectInlineTitle />
        <ProjectOutcomeEditorInline />
      </ProjectFieldsProvider>,
    );

    // Title bắt đầu lưu — cố tình chưa resolve.
    fireEvent.click(screen.getByRole("button", { name: /Ra mắt sản phẩm/ }));
    fireEvent.change(screen.getByLabelText("Tên Project"), {
      target: { value: "Ra mắt sản phẩm mới" },
    });
    blurElement(screen.getByLabelText("Tên Project"));
    await waitFor(() => expect(mutation).toHaveBeenCalledOnce());

    // Lưu outcome ngay khi title vẫn đang chờ — phải xếp hàng sau title
    // qua cùng `runExclusive`, không được gửi song song với revision cũ.
    fireEvent.click(screen.getByRole("button", { name: "Xác định" }));
    fireEvent.change(screen.getByPlaceholderText(/Bạn muốn đạt được/), {
      target: { value: "Ra mắt bản beta cho 100 người dùng đầu tiên" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    resolveTitleSave({
      status: "success",
      project: {
        ...projectWithCycle,
        title: "Ra mắt sản phẩm mới",
        revision: 4,
      },
    });

    await waitFor(() => expect(outcomeMutation).toHaveBeenCalledOnce());
    expect(outcomeMutation).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 4 }),
    );
  });
});
