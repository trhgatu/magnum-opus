"use client";

import type { ProjectResponse } from "@repo/contracts";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type ProjectMutationResult,
  setProjectIntendedOutcome,
  setProjectTargetEndDate,
  updateProject,
} from "@/features/project/actions/project";
import {
  type LifecycleTransition,
  ProjectLifecycleControls,
  ProjectResumeButton,
} from "@/features/project/components/project-lifecycle-controls";
import {
  ProjectOutcomeEditor,
  type ProjectOutcomeSubmitResult,
} from "@/features/project/components/project-outcome-editor";
import { ProjectOutcomeHistory } from "@/features/project/components/project-outcome-history";
import { ProjectDetailsFields } from "@/features/project/components/project-editor";
import { ProjectTargetEndEditor } from "@/features/project/components/project-target-end-editor";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const isRevisionConflict = (code?: string) =>
  code === "PROJECT_REVISION_CONFLICT";

/** Tên/mô tả (sheet Chỉnh sửa), outcome, ngày dự kiến và nút đổi trạng thái
 * dùng chung `expectedRevision`, nên phải chia sẻ một bản `project` — nếu
 * mỗi chỗ tự giữ prop `project` riêng, lưu chỗ này rồi lưu chỗ kia ngay sau
 * đó sẽ gửi cùng revision cũ và bị 409 dù hai lần lưu là tuần tự, không thật
 * sự xung đột.
 *
 * `projectRef`/`runExclusive` xử lý trường hợp còn lại: lần lưu thứ hai bắt
 * đầu *trước khi* request đầu hoàn tất. `runExclusive` xếp hàng request thứ
 * hai sau request thứ nhất; đọc `projectRef.current` (chứ không phải
 * `project` đóng gói lúc render) đảm bảo nó luôn thấy revision mới nhất tại
 * thời điểm thật sự gửi đi, bất kể state React đã re-render kịp hay chưa. */
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
  /** Bản ref của `externalUpdateToken`, luôn đồng bộ ngay lập tức (không
   * đợi re-render). Một commit/submit đã bắt đầu (đặc biệt khi đang xếp
   * hàng chờ trong `runExclusive`) cần so sánh với giá trị này *ngay
   * trước khi thật sự gửi request* — nếu đã đổi so với lúc bắt đầu, nghĩa
   * là có cập nhật từ bên ngoài xen vào giữa chừng, phải bỏ request đó
   * thay vì gửi đè draft đã bị hủy lên dữ liệu vừa tải về. */
  externalUpdateTokenRef: React.RefObject<number>;
  /** Mọi nút đổi lifecycle trong Provider chờ chung một transition. */
  lifecycleTransition: LifecycleTransition;
} | null>(null);

function useProjectFields() {
  const context = useContext(ProjectFieldsContext);
  if (!context) {
    throw new Error("Phải nằm trong ProjectFieldsProvider");
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
  const [externalUpdateToken, setExternalUpdateTokenState] = useState(0);
  const externalUpdateTokenRef = useRef(externalUpdateToken);
  const lifecycleTransition = useTransition();

  const setProject = (next: ProjectResponse) => {
    projectRef.current = next;
    setProjectState(next);
  };

  const bumpExternalUpdateToken = () => {
    const next = externalUpdateTokenRef.current + 1;
    externalUpdateTokenRef.current = next;
    setExternalUpdateTokenState(next);
  };

  // Không dùng `key` để remount Provider mỗi khi `project.revision` đổi —
  // sau một lần lưu thành công, `setProject` đã đồng bộ state cục bộ ngay
  // lập tức; nếu router.refresh() sau đó khiến Server Component re-render
  // với cùng revision rồi remount cả cây, ô đang gõ dở ở chỗ khác sẽ mất
  // trắng draft chưa lưu. Thay vào đó,
  // chỉ đồng bộ khi prop mới thật sự MỚI HƠN state cục bộ hiện tại — case
  // này chỉ xảy ra khi có nguồn khác cập nhật project (vd bấm "Tải bản mới
  // nhất" sau conflict), không xảy ra ở nhánh tự lưu thành công (lúc đó
  // state cục bộ đã ở đúng revision mới rồi, so sánh không thấy "mới hơn").
  // `externalUpdateToken` tăng lên đúng ở nhánh này — ô nào đang mở dở sẽ
  // tự theo bản mới + bỏ draft cũ, không âm thầm giữ draft rồi lỡ gửi đè lên
  // dữ liệu vừa tải về.
  useEffect(() => {
    if (initialProject.revision > projectRef.current.revision) {
      setProject(initialProject);
      bumpExternalUpdateToken();
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
        externalUpdateTokenRef,
        lifecycleTransition,
      }}
    >
      {children}
    </ProjectFieldsContext.Provider>
  );
}

/** Gửi một thay đổi của Project (tên/mô tả trong sheet, outcome, ngày dự
 * kiến) qua một hàng đợi `runExclusive` chung, đọc `id`/`revision` từ
 * context tại đúng lúc gửi — cùng lý do với `ProjectLifecycleControlsInline`:
 * 2 lần lưu gần nhau (dù không thật sự xung đột) không được cùng gửi 1
 * revision cũ. Các editor thuần UI không biết gì về context; toàn bộ phần
 * này nằm ở hàm mà hook trả về. */
function useQueuedProjectSubmit() {
  const router = useRouter();
  const { projectRef, setProject, runExclusive, externalUpdateTokenRef } =
    useProjectFields();

  return async (
    mutate: (current: ProjectResponse) => Promise<ProjectMutationResult>,
  ): Promise<ProjectOutcomeSubmitResult> => {
    // Chụp token TẠI THỜI ĐIỂM bấm Lưu, không phải lúc dispatch thật sự
    // (có thể muộn hơn do đang xếp hàng sau một lần lưu khác). Nếu có cập
    // nhật từ bên ngoài xen vào giữa, ô sửa đã tự theo bản mới qua
    // `externalUpdateToken`; bản nháp đang cầm không được gửi đè lên.
    const tokenAtSubmit = externalUpdateTokenRef.current;
    const result = await runExclusive<
      ProjectMutationResult | { status: "stale" }
    >(() => {
      if (externalUpdateTokenRef.current !== tokenAtSubmit) {
        return Promise.resolve({ status: "stale" as const });
      }
      return mutate(projectRef.current);
    });

    if (result.status === "stale") {
      return { status: "stale" };
    }

    if (result.status === "error") {
      return {
        status: "error",
        message: isRevisionConflict(result.code)
          ? "Project đã thay đổi ở một phiên làm việc khác."
          : result.message,
        hasConflict: isRevisionConflict(result.code),
      };
    }

    // Request đã dispatch trước token check, nhưng có cập nhật từ bên ngoài
    // đến trong lúc nó đang bay thì không được áp result (phản ánh revision
    // lúc gửi, cũ hơn) đè lên state dùng chung; router.refresh() sẽ tự đồng
    // bộ lại đúng sự thật mới nhất.
    if (externalUpdateTokenRef.current !== tokenAtSubmit) {
      router.refresh();
      return { status: "success" };
    }

    setProject(result.project);
    router.refresh();
    return { status: "success" };
  };
}

/** Tên và mô tả trên trang chi tiết: chỉ hiển thị, sửa qua sheet. Đọc từ
 * context để thấy ngay bản vừa lưu, không chờ router.refresh(). */
export function ProjectDetailTitle() {
  return useProjectFields().project.title;
}

export function ProjectDetailDescription({
  placeholder,
}: {
  placeholder: string;
}) {
  const { project } = useProjectFields();
  return (
    <span className={cn(!project.description && "italic")}>
      {project.description ?? placeholder}
    </span>
  );
}

const DISCARD_WARNING =
  "Nội dung chưa được lưu. Đóng lúc này sẽ làm mất phần đang viết.";

/** Nút Chỉnh sửa và sheet sửa tên/mô tả. Lưu đi qua cùng hàng đợi với các
 * ô sửa của Cycle, nên không bao giờ gửi một revision cũ. */
export function ProjectEditAction() {
  const router = useRouter();
  const { project, externalUpdateToken } = useProjectFields();
  const submit = useQueuedProjectSubmit();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    open &&
    (title !== project.title || description !== (project.description ?? ""));
  useUnsavedChangesWarning(isDirty);

  const resetTo = (latest: ProjectResponse) => {
    setTitle(latest.title);
    setDescription(latest.description ?? "");
    setMessage(undefined);
    setHasConflict(false);
  };

  // Có bản mới từ bên ngoài (vd "Tải bản mới nhất" sau xung đột): form theo
  // bản mới và bỏ bản nháp cũ, như các ô sửa khác của Project — không lỡ
  // gửi đè bản nháp lên dữ liệu vừa tải về.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetTo(project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUpdateToken]);

  const openSheet = () => {
    resetTo(project);
    setOpen(true);
  };

  const requestClose = () => {
    if (isDirty && !window.confirm(DISCARD_WARNING)) return;
    setOpen(false);
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextDescription = description.trim() || null;
    if (!nextTitle) {
      setMessage("Tên Project không được để trống.");
      setHasConflict(false);
      return;
    }
    if (
      nextTitle === project.title &&
      nextDescription === project.description
    ) {
      setOpen(false);
      return;
    }

    setMessage(undefined);
    setHasConflict(false);
    startTransition(async () => {
      const result = await submit((current) =>
        updateProject({
          id: current.id,
          expectedRevision: current.revision,
          title: nextTitle,
          description: nextDescription,
        }),
      );

      // stale: form đã tự theo bản mới (effect ở trên), không có gì để báo.
      if (result.status === "stale") return;
      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.hasConflict === true);
        return;
      }

      void notifySuccess(`Đã cập nhật "${nextTitle}"`);
      setOpen(false);
    });
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={openSheet}>
        <Pencil aria-hidden="true" /> Chỉnh sửa
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
      >
        {/* Cùng biến thể data-[side=right] với sheet.tsx thì mới đè được. */}
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="pr-12">
            <SheetTitle>Chỉnh sửa Project</SheetTitle>
            <SheetDescription>
              Đổi tên hoặc mô tả. Các Cycle và hoạt động đã ghi vẫn giữ nguyên.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={save}
            className="space-y-5 px-4 pb-6"
            aria-busy={isPending}
          >
            {message ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {message}
                  {hasConflict ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-destructive"
                      onClick={() => router.refresh()}
                    >
                      Tải bản mới nhất
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <ProjectDetailsFields
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              disabled={isPending}
            />
            <footer className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isPending}
                onClick={requestClose}
              >
                Hủy
              </Button>
              <Button type="submit" size="lg" disabled={isPending}>
                <Save aria-hidden="true" />
                {isPending ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            </footer>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** `ProjectLifecycleControls` phải đọc `project` từ context chia sẻ này,
 * không phải prop truyền từ Server Component cha — nếu không, một hành
 * động lifecycle (pause/stop/...) ngay sau một lần lưu khác (trước khi
 * router.refresh() kịp round-trip) sẽ gửi `expectedRevision` cũ và bị 409
 * dù lần lưu title/description trước đó đã thành công. */
export function ProjectLifecycleControlsInline() {
  const { project, lifecycleTransition } = useProjectFields();
  return (
    <ProjectLifecycleControls
      id={project.id}
      title={project.title}
      lifecycleState={project.lifecycleState}
      revision={project.revision}
      transition={lifecycleTransition}
    />
  );
}

/** Nút Tiếp tục của lời nhắc D2 — chỉ còn ý nghĩa khi Project vẫn tạm dừng. */
export function ProjectResumeInline() {
  const { project, lifecycleTransition } = useProjectFields();
  if (project.lifecycleState !== "PAUSED") return null;
  return (
    <ProjectResumeButton
      id={project.id}
      title={project.title}
      revision={project.revision}
      transition={lifecycleTransition}
    />
  );
}

export function ProjectOutcomeEditorInline({ timeZone }: { timeZone: string }) {
  const router = useRouter();
  const { project, externalUpdateToken } = useProjectFields();
  const submit = useQueuedProjectSubmit();

  if (!project.currentCycle) return null;

  return (
    <div className="flex flex-col gap-4">
      <ProjectOutcomeEditor
        intendedOutcome={project.currentCycle.intendedOutcome}
        externalUpdateToken={externalUpdateToken}
        onSubmit={(intendedOutcome) =>
          submit((current) =>
            setProjectIntendedOutcome({
              id: current.id,
              intendedOutcome,
              expectedRevision: current.revision,
            }),
          )
        }
        onReload={() => router.refresh()}
      />
      <ProjectOutcomeHistory
        history={project.currentCycle.outcomeHistory}
        timeZone={timeZone}
      />
    </div>
  );
}

export function ProjectTargetEndEditorInline({ today }: { today: string }) {
  const router = useRouter();
  const { project } = useProjectFields();
  const submit = useQueuedProjectSubmit();

  if (!project.currentCycle) return null;

  return (
    <ProjectTargetEndEditor
      targetEndAt={project.currentCycle.targetEndAt}
      today={today}
      onSubmit={(targetEndAt) =>
        submit((current) =>
          setProjectTargetEndDate({
            id: current.id,
            targetEndAt,
            expectedRevision: current.revision,
          }),
        )
      }
      onReload={() => router.refresh()}
    />
  );
}
