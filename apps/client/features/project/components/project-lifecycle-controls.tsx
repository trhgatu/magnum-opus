"use client";

import type { ProjectLifecycleState } from "@repo/contracts";
import {
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  type TransitionStartFunction,
  useId,
  useState,
  useTransition,
} from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  changeProjectLifecycle,
  deleteProjectPermanently,
  type ProjectLifecycleAction,
} from "@/features/project/actions/project";
import { isRedirectError } from "@/lib/next-redirect";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PROJECT_REVISION_CONFLICT = "PROJECT_REVISION_CONFLICT";
const PROJECT_DELETION_NOT_ALLOWED = "PROJECT_DELETION_NOT_ALLOWED";

const CLOSING_NOTE_MAX_LENGTH = 2000;

const REVISION_CONFLICT_MESSAGE =
  "Project đã thay đổi ở một phiên làm việc khác.";

const isRevisionConflict = (code?: string) =>
  code === PROJECT_REVISION_CONFLICT;

/**
 * Một transition dùng chung cho mọi nút đổi lifecycle trên cùng trang: nút
 * này đang chạy thì nút kia cũng chờ — như nút Tiếp tục của Activity (D2)
 * và thanh hành động (06 §9).
 */
export type LifecycleTransition = readonly [boolean, TransitionStartFunction];

const AVAILABLE_ACTIONS: Record<
  ProjectLifecycleState,
  readonly ProjectLifecycleAction[]
> = {
  NOT_STARTED: ["start", "stop"],
  ACTIVE: ["pause", "stop", "complete"],
  PAUSED: ["resume", "stop", "complete"],
  STOPPED: ["reopen"],
  COMPLETED: ["reopen"],
};

// Chỉ NOT_STARTED và STOPPED CÓ THỂ đủ điều kiện xóa (BR-PRJ-029:
// cycles.length == 0) — ACTIVE/PAUSED luôn có current Cycle, COMPLETED
// luôn đạt được sau khi đã Start/Reopen. Với STOPPED, component không thể
// tự biết đây là "chưa từng Start" hay "đã từng có Cycle" (response không
// trả lịch sử) — nút vẫn hiện, server là nơi quyết định thật qua 409.
const DELETE_ELIGIBLE_STATES: readonly ProjectLifecycleState[] = [
  "NOT_STARTED",
  "STOPPED",
];

const ACTION_META: Record<
  ProjectLifecycleAction,
  {
    label: string;
    icon: typeof Play;
    successMessage: (title: string) => string;
  }
> = {
  start: {
    label: "Bắt đầu",
    icon: Play,
    successMessage: (title) => `Đã bắt đầu "${title}"`,
  },
  pause: {
    label: "Tạm dừng",
    icon: Pause,
    successMessage: (title) => `Đã tạm dừng "${title}"`,
  },
  resume: {
    label: "Tiếp tục",
    icon: Play,
    successMessage: (title) => `Đã tiếp tục "${title}"`,
  },
  stop: {
    label: "Dừng lại",
    icon: Square,
    successMessage: (title) => `Đã dừng "${title}"`,
  },
  complete: {
    label: "Hoàn thành",
    icon: CheckCircle2,
    successMessage: (title) => `Đã hoàn thành "${title}"`,
  },
  reopen: {
    label: "Mở lại",
    icon: RotateCcw,
    successMessage: (title) => `Đã mở lại "${title}"`,
  },
};

// Complete/Stop đóng Cycle vĩnh viễn (BR-PRJ-019/027 — không thể sửa hay xóa
// sau đó), nên cần xác nhận trước khi thực thi để chặn misclick — khác
// Start/Pause/Resume/Reopen vốn rủi ro thấp hơn nhiều. Đây thuần là UI-level
// safeguard chống bấm nhầm, KHÔNG phải cơ chế cho phép đổi ý sau khi đã xác
// nhận — domain vẫn không có khái niệm "hối lại".
const CONFIRM_REQUIRED_ACTIONS: Partial<
  Record<ProjectLifecycleAction, { title: string; description: string }>
> = {
  complete: {
    title: "Đánh dấu Project này đã hoàn thành?",
    description:
      "Cycle hiện tại sẽ đóng lại vĩnh viễn với lý do COMPLETED. Bạn vẫn có thể Reopen sau đó để tiếp tục, nhưng lịch sử Cycle này không thể sửa hay xóa.",
  },
  stop: {
    title: "Dừng Project này lại?",
    description:
      "Cycle hiện tại (nếu có) sẽ đóng lại vĩnh viễn với lý do STOPPED. Bạn vẫn có thể Reopen sau đó để tiếp tục, nhưng lịch sử Cycle này không thể sửa hay xóa.",
  },
};

type ProjectLifecycleControlsProps = {
  id: string;
  title: string;
  lifecycleState: ProjectLifecycleState;
  revision: number;
  transition?: LifecycleTransition;
};

type LifecycleError = {
  message: string;
  code?: string;
};

export function ProjectLifecycleControls({
  id,
  title,
  lifecycleState,
  revision,
  transition,
}: ProjectLifecycleControlsProps) {
  const router = useRouter();

  const [error, setError] = useState<LifecycleError | null>(null);
  const hasConflict = isRevisionConflict(error?.code);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmingAction, setConfirmingAction] =
    useState<ProjectLifecycleAction | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ProjectLifecycleAction | null>(null);
  const ownTransition = useTransition();
  const [isPending, startTransition] = transition ?? ownTransition;
  const [closingNote, setClosingNote] = useState("");
  const closingNoteId = useId();
  // Chỉ ACTIVE/PAUSED có Cycle đang mở để ghi chú (BR-PRJ-034) — Stop từ
  // NOT_STARTED không đóng Cycle nào, server sẽ từ chối ghi chú.
  const canAddClosingNote =
    lifecycleState === "ACTIVE" || lifecycleState === "PAUSED";
  // Đếm theo ký tự (code point) trên bản đã trim — đúng cách server đếm —
  // để báo vượt giới hạn ngay khi gõ, thay vì đợi bấm xác nhận mới biết.
  // Không cắt bớt chữ người dùng đã gõ: chỉ chặn nút xác nhận.
  const closingNoteLength = [...closingNote.trim()].length;
  const closingNoteTooLong =
    canAddClosingNote && closingNoteLength > CLOSING_NOTE_MAX_LENGTH;

  const anyDialogOpen = deleteOpen || confirmingAction !== null;

  const reloadLatestRevision = () => {
    setError(null);
    setDeleteOpen(false);
    setConfirmingAction(null);
    setClosingNote("");
    router.refresh();
  };

  const runLifecycleAction = (action: ProjectLifecycleAction) => {
    setError(null);
    setPendingAction(action);

    startTransition(async () => {
      try {
        const result = await changeProjectLifecycle({
          id,
          expectedRevision: revision,
          action,
          ...(canAddClosingNote && closingNote.trim() ? { closingNote } : {}),
        });

        if (result.status === "error") {
          setError({
            code: result.code,
            message: isRevisionConflict(result.code)
              ? REVISION_CONFLICT_MESSAGE
              : result.message,
          });
          return;
        }

        setConfirmingAction(null);
        setClosingNote("");
        void notifySuccess(ACTION_META[action].successMessage(title));
        router.refresh();
      } catch {
        setError({ message: "Không thể cập nhật Project. Vui lòng thử lại." });
      }
    });
  };

  const runPermanentDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // deleteProjectPermanently chỉ return khi thất bại — thành công thì
        // Server Action tự redirect("/projects"), nhảy thẳng xuống catch
        // dạng lỗi NEXT_REDIRECT bên dưới, không bao giờ chạy tới sau await.
        const result = await deleteProjectPermanently({
          id,
          expectedRevision: revision,
        });

        if (result.status === "error") {
          setError({
            code: result.code,
            message:
              result.code === PROJECT_DELETION_NOT_ALLOWED
                ? "Project đã từng có Project Cycle nên không thể xóa vĩnh viễn."
                : isRevisionConflict(result.code)
                  ? REVISION_CONFLICT_MESSAGE
                  : result.message,
          });
        }
      } catch (error) {
        if (isRedirectError(error)) {
          await notifySuccess(`Đã xóa vĩnh viễn "${title}"`).catch(() => {});
          throw error;
        }

        setError({ message: "Không thể xóa Project. Vui lòng thử lại." });
      }
    });
  };

  const errorAlert = error ? (
    <LifecycleErrorAlert
      message={error.message}
      hasConflict={hasConflict}
      onReload={reloadLatestRevision}
    />
  ) : null;

  const confirmMeta = confirmingAction
    ? CONFIRM_REQUIRED_ACTIONS[confirmingAction]
    : undefined;

  return (
    <div
      role="group"
      className="flex flex-col items-end gap-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời Project"
    >
      {!anyDialogOpen ? errorAlert : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {AVAILABLE_ACTIONS[lifecycleState].map((action) => {
          const { label, icon: Icon } = ACTION_META[action];
          const isThisPending = isPending && pendingAction === action;
          const requiresConfirm = action in CONFIRM_REQUIRED_ACTIONS;

          return (
            <Button
              key={action}
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                requiresConfirm
                  ? setConfirmingAction(action)
                  : runLifecycleAction(action)
              }
            >
              <Icon aria-hidden="true" />
              {isThisPending ? "Đang cập nhật…" : label}
            </Button>
          );
        })}

        {DELETE_ELIGIBLE_STATES.includes(lifecycleState) ? (
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              if (isPending) return;
              setDeleteOpen(open);
              if (open) setError(null);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isPending}>
                <Trash2 aria-hidden="true" />
                Xóa vĩnh viễn
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa vĩnh viễn Project này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Project sẽ biến mất khỏi Magnum Opus và không thể khôi phục.
                  Chỉ những Project chưa từng có Project Cycle nào mới thực sự
                  xóa được.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {deleteOpen ? errorAlert : null}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Giữ lại
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isPending}
                  onClick={runPermanentDelete}
                >
                  {isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      <AlertDialog
        open={confirmingAction !== null}
        onOpenChange={(open) => {
          if (isPending) return;
          if (!open) {
            setConfirmingAction(null);
            setClosingNote("");
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMeta?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMeta?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {canAddClosingNote ? (
            <div className="grid gap-2">
              <Label htmlFor={closingNoteId}>
                Ghi chú khép lại (không bắt buộc)
              </Label>
              <Textarea
                id={closingNoteId}
                value={closingNote}
                onChange={(event) => setClosingNote(event.target.value)}
                placeholder="Chu kỳ này đã diễn ra thế nào? Điều gì đáng nhớ?"
                rows={4}
                disabled={isPending}
                aria-invalid={closingNoteTooLong}
                aria-describedby={`${closingNoteId}-count`}
              />
              <p
                id={`${closingNoteId}-count`}
                className={cn(
                  "text-right font-mono text-xs tabular-nums",
                  closingNoteTooLong
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {closingNoteLength}/{CLOSING_NOTE_MAX_LENGTH}
              </p>
              {/* Bộ đếm đổi theo từng phím nên không đọc to; chỉ báo một
                  lần lúc vượt giới hạn — cũng là lý do nút xác nhận bị khóa. */}
              {closingNoteTooLong ? (
                <p role="alert" className="text-xs text-destructive">
                  Ghi chú dài quá {CLOSING_NOTE_MAX_LENGTH} ký tự — rút gọn để
                  xác nhận.
                </p>
              ) : null}
            </div>
          ) : null}

          {confirmingAction !== null ? errorAlert : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || closingNoteTooLong}
              onClick={(event) => {
                event.preventDefault();
                if (confirmingAction) runLifecycleAction(confirmingAction);
              }}
            >
              {isPending && confirmingAction
                ? "Đang cập nhật…"
                : confirmingAction
                  ? ACTION_META[confirmingAction].label
                  : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Nút Tiếp tục đứng ngoài thanh hành động (lời nhắc D2 của Activity, 06 §9).
 * Chính là Resume: cùng transition, cùng thông báo, cùng xử lý xung đột.
 */
export function ProjectResumeButton({
  id,
  title,
  revision,
  transition,
}: {
  id: string;
  title: string;
  revision: number;
  transition?: LifecycleTransition;
}) {
  const router = useRouter();
  const ownTransition = useTransition();
  const [isPending, startTransition] = transition ?? ownTransition;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<LifecycleError | null>(null);
  const { label, icon: Icon } = ACTION_META.resume;

  const resume = () => {
    setError(null);
    setRunning(true);

    startTransition(async () => {
      try {
        const result = await changeProjectLifecycle({
          id,
          expectedRevision: revision,
          action: "resume",
        });

        if (result.status === "error") {
          setRunning(false);
          setError({
            code: result.code,
            message: isRevisionConflict(result.code)
              ? REVISION_CONFLICT_MESSAGE
              : result.message,
          });
          return;
        }

        void notifySuccess(ACTION_META.resume.successMessage(title));
        router.refresh();
      } catch {
        setRunning(false);
        setError({ message: "Không thể cập nhật Project. Vui lòng thử lại." });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={resume}
      >
        <Icon aria-hidden="true" />
        {isPending && running ? "Đang cập nhật…" : label}
      </Button>
      {error ? (
        <LifecycleErrorAlert
          message={error.message}
          hasConflict={isRevisionConflict(error.code)}
          onReload={() => {
            setError(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
