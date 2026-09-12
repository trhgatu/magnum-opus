"use client";

import type { ProjectResponse } from "@repo/contracts";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/features/project/actions/project";
import { ProjectLifecycleControls } from "@/features/project/components/project-lifecycle-controls";
import { ProjectOutcomeEditor } from "@/features/project/components/project-outcome-editor";
import { cn } from "@/lib/utils";

const isRevisionConflict = (code?: string) =>
  code === "PROJECT_REVISION_CONFLICT";

/** title/description dùng chung `expectedRevision`, nên hai field inline
 * phải chia sẻ một bản `project` — nếu mỗi field tự giữ prop `project`
 * riêng, sửa title rồi sửa description ngay sau đó sẽ gửi cùng revision cũ
 * và bị 409 dù hai lần sửa là tuần tự, không thật sự xung đột.
 *
 * `projectRef`/`runExclusive` xử lý trường hợp còn lại: sửa xong field này
 * blur sang field kia *trước khi* request đầu hoàn tất. `runExclusive` xếp
 * hàng request thứ hai sau request thứ nhất; đọc `projectRef.current` (chứ
 * không phải `project` đóng gói lúc render) đảm bảo nó luôn thấy revision
 * mới nhất tại thời điểm thật sự gửi đi, bất kể state React đã re-render
 * kịp hay chưa. Mô hình này giống hệt `habit-inline-fields.tsx`. */
const ProjectFieldsContext = createContext<{
  project: ProjectResponse;
  projectRef: React.RefObject<ProjectResponse>;
  setProject: (project: ProjectResponse) => void;
  runExclusive: <T>(task: () => Promise<T>) => Promise<T>;
  /** Tăng lên mỗi khi Provider chấp nhận một `project` mới **từ bên
   * ngoài** (revision nhảy lên mà không phải do chính field đó vừa lưu
   * — vd bấm "Tải bản mới nhất" sau conflict). Field đang mở dở dùng
   * giá trị này để tự đóng editor + bỏ draft cũ, tránh gửi lại draft
   * xung đột đè lên dữ liệu mới vừa tải về. */
  externalUpdateToken: number;
} | null>(null);

function useProjectFields() {
  const context = useContext(ProjectFieldsContext);
  if (!context) {
    throw new Error(
      "ProjectInlineTitle/ProjectInlineDescription phải nằm trong ProjectFieldsProvider",
    );
  }
  return context;
}

export function ProjectFieldsProvider({
  initialProject,
  children,
}: {
  initialProject: ProjectResponse;
  children: ReactNode;
}) {
  const [project, setProjectState] = useState(initialProject);
  const projectRef = useRef(project);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [externalUpdateToken, setExternalUpdateToken] = useState(0);

  const setProject = (next: ProjectResponse) => {
    projectRef.current = next;
    setProjectState(next);
  };

  // Không dùng `key` để remount Provider mỗi khi `project.revision` đổi —
  // sau một lần lưu inline thành công, `setProject` đã đồng bộ state cục
  // bộ ngay lập tức; nếu router.refresh() sau đó khiến Server Component
  // re-render với cùng revision rồi remount cả cây, field còn lại (title
  // hoặc description) đang gõ dở sẽ mất trắng draft chưa lưu. Thay vào đó,
  // chỉ đồng bộ khi prop mới thật sự MỚI HƠN state cục bộ hiện tại — case
  // này chỉ xảy ra khi có nguồn khác cập nhật project (vd bấm "Tải bản mới
  // nhất" sau conflict), không xảy ra ở nhánh tự lưu thành công (lúc đó
  // state cục bộ đã ở đúng revision mới rồi, so sánh không thấy "mới hơn").
  // `externalUpdateToken` tăng lên đúng ở nhánh này — field nào đang mở dở
  // sẽ tự đóng lại + bỏ draft cũ, không âm thầm giữ draft rồi lỡ gửi đè lên
  // dữ liệu vừa tải về.
  useEffect(() => {
    if (initialProject.revision > projectRef.current.revision) {
      setProject(initialProject);
      setExternalUpdateToken((token) => token + 1);
    }
  }, [initialProject]);

  function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return (
    <ProjectFieldsContext.Provider
      value={{
        project,
        projectRef,
        setProject,
        runExclusive,
        externalUpdateToken,
      }}
    >
      {children}
    </ProjectFieldsContext.Provider>
  );
}

/** Lỗi hiển thị ngay trong lúc sửa — dựng bằng phrasing content thuần
 * (span/button, không div) vì nội dung này nằm bên trong <h1>/<p> của
 * ContextHero; một khối `<div>` ở đây là HTML không hợp lệ và trình
 * duyệt sẽ tự đóng thẻ cha, làm vỡ layout. */
function InlineFieldError({
  message,
  hasConflict,
  onReload,
}: {
  message: string;
  hasConflict: boolean;
  onReload: () => void;
}) {
  return (
    <span
      role="alert"
      className="mt-1 block text-sm font-medium text-destructive"
    >
      {message}
      {hasConflict ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="ml-1 h-auto p-0 align-baseline text-destructive"
          // Ngăn nút này lấy focus khi mousedown — nếu không, input/textarea
          // đang sửa sẽ blur trước, tự kích hoạt lưu lại với cùng revision
          // đã xung đột, trước khi onClick reload kịp chạy.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onReload}
        >
          Tải bản mới nhất
        </Button>
      ) : null}
    </span>
  );
}

function useInlineProjectField() {
  const router = useRouter();
  const { project, projectRef, setProject, runExclusive, externalUpdateToken } =
    useProjectFields();
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clearError = () => {
    setMessage(undefined);
    setHasConflict(false);
  };

  const reloadLatestRevision = () => {
    clearError();
    router.refresh();
  };

  const commit = (
    patch: { title: string } | { description: string | null },
    onSettled: (didSave: boolean) => void,
  ) => {
    clearError();
    startTransition(async () => {
      // `runExclusive` xếp request này sau bất kỳ commit nào (của field
      // title hoặc description) đang chạy dở. Field không đổi được lấy từ
      // `projectRef.current` *ngay trước khi gửi* — không phải từ closure
      // của component đang sửa — nên nếu field kia vừa lưu xong trong lúc
      // field này chờ tới lượt, request này vẫn mang theo giá trị mới nhất
      // của field kia (và cả revision mới nhất) thay vì ghi đè bằng bản cũ.
      const result = await runExclusive(() => {
        const current = projectRef.current;
        return updateProject({
          id: current.id,
          expectedRevision: current.revision,
          title: "title" in patch ? patch.title : current.title,
          description:
            "description" in patch ? patch.description : current.description,
        });
      });

      if (result.status === "error") {
        setMessage(
          isRevisionConflict(result.code)
            ? "Project đã thay đổi ở một phiên làm việc khác."
            : result.message,
        );
        setHasConflict(isRevisionConflict(result.code));
        onSettled(false);
        return;
      }

      // Cập nhật ngay bản `project` dùng chung để field còn lại (title hoặc
      // description) thấy revision mới nhất mà không phải chờ
      // router.refresh() round-trip qua server.
      setProject(result.project);
      onSettled(true);
      router.refresh();
    });
  };

  return {
    project,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
    externalUpdateToken,
  };
}

export function ProjectInlineTitle() {
  const {
    project,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
    externalUpdateToken,
  } = useInlineProjectField();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(project.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const headingClassName =
    "font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl";

  const startEditing = () => {
    clearError();
    setValue(project.title);
    setIsEditing(true);
  };

  const cancel = () => {
    clearError();
    setValue(project.title);
    setIsEditing(false);
  };

  // Nếu context vừa nhận `project` mới TỪ BÊN NGOÀI (vd "Tải bản mới
  // nhất" sau conflict, không phải do chính field này tự lưu), đóng
  // editor và bỏ draft cũ ngay — nếu không, blur sau đó sẽ so sánh draft
  // cũ với `project.title` MỚI rồi lỡ gửi đè lên dữ liệu vừa tải về.
  useEffect(() => {
    // Cố ý: đóng editor đang mở khi có tín hiệu cập nhật từ bên ngoài,
    // không phải suy ra UI state từ prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isEditing) cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUpdateToken]);

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === project.title) {
      setValue(project.title);
      setIsEditing(false);
      return;
    }

    commit({ title: trimmed }, (didSave) => {
      if (didSave) setIsEditing(false);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      inputRef.current?.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <span className="block">
        <Input
          ref={inputRef}
          autoFocus
          value={value}
          maxLength={200}
          disabled={isPending}
          aria-label="Tên Project"
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
          className={cn(
            headingClassName,
            "h-auto w-full rounded-md border-0 border-b border-dashed border-input bg-transparent px-0 py-0 shadow-none focus-visible:ring-0",
          )}
        />
        {message ? (
          <InlineFieldError
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        headingClassName,
        "group inline-flex w-full items-baseline gap-2 rounded-md text-left hover:cursor-text",
      )}
    >
      {project.title}
      <Pencil
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </button>
  );
}

export function ProjectInlineDescription({
  placeholder,
}: {
  placeholder: string;
}) {
  const {
    project,
    message,
    hasConflict,
    isPending,
    commit,
    clearError,
    reloadLatestRevision,
    externalUpdateToken,
  } = useInlineProjectField();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(project.description ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bodyClassName =
    "max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7";

  const startEditing = () => {
    clearError();
    setValue(project.description ?? "");
    setIsEditing(true);
  };

  const cancel = () => {
    clearError();
    setValue(project.description ?? "");
    setIsEditing(false);
  };

  // Xem giải thích ở ProjectInlineTitle — đóng editor + bỏ draft khi
  // context vừa nhận project mới từ bên ngoài (không phải tự lưu).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isEditing) cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUpdateToken]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed === (project.description ?? "")) {
      setIsEditing(false);
      return;
    }

    commit({ description: trimmed || null }, (didSave) => {
      if (didSave) setIsEditing(false);
    });
  };

  if (isEditing) {
    return (
      <span className="mt-4 block max-w-2xl">
        <Textarea
          ref={textareaRef}
          autoFocus
          value={value}
          disabled={isPending}
          aria-label="Mô tả Project"
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          className={cn(
            bodyClassName,
            "min-h-16 rounded-md border-dashed bg-transparent px-2.5 py-1.5",
          )}
        />
        {message ? (
          <InlineFieldError
            message={message}
            hasConflict={hasConflict}
            onReload={reloadLatestRevision}
          />
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        bodyClassName,
        "group mt-4 inline-flex w-full items-start gap-2 rounded-md text-left hover:cursor-text",
        !project.description && "italic",
      )}
    >
      <span>{project.description ?? `${placeholder} Bấm để thêm mô tả.`}</span>
      <Pencil
        className="mt-1 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </button>
  );
}

/** `ProjectLifecycleControls` phải đọc `project` từ context chia sẻ này,
 * không phải prop truyền từ Server Component cha — nếu không, một hành
 * động lifecycle (pause/stop/...) ngay sau một lần lưu inline (trước khi
 * router.refresh() kịp round-trip) sẽ gửi `expectedRevision` cũ và bị 409
 * dù lần lưu title/description trước đó đã thành công. */
export function ProjectLifecycleControlsInline() {
  const { project } = useProjectFields();
  return (
    <ProjectLifecycleControls
      id={project.id}
      title={project.title}
      lifecycleState={project.lifecycleState}
      revision={project.revision}
    />
  );
}

/** Cùng lý do với `ProjectLifecycleControlsInline`: `ProjectOutcomeEditor`
 * phải đọc `revision`/`intendedOutcome` từ context chia sẻ, không phải
 * prop truyền từ Server Component cha — nếu không, lưu intended outcome
 * ngay sau một lần lưu title/description inline sẽ gửi `expectedRevision`
 * cũ và bị 409 giả. */
export function ProjectOutcomeEditorInline() {
  const { project, setProject } = useProjectFields();
  if (!project.currentCycle) return null;
  return (
    <ProjectOutcomeEditor
      id={project.id}
      revision={project.revision}
      intendedOutcome={project.currentCycle.intendedOutcome}
      onSaved={setProject}
    />
  );
}
