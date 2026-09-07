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
import { type MouseEvent, useState, useTransition } from "react";

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

const PROJECT_REVISION_CONFLICT = "PROJECT_REVISION_CONFLICT";
const PROJECT_DELETION_NOT_ALLOWED = "PROJECT_DELETION_NOT_ALLOWED";

const isRevisionConflict = (code?: string) =>
  code === PROJECT_REVISION_CONFLICT;

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
}: ProjectLifecycleControlsProps) {
  const router = useRouter();

  const [error, setError] = useState<LifecycleError | null>(null);
  const hasConflict = isRevisionConflict(error?.code);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmingAction, setConfirmingAction] =
    useState<ProjectLifecycleAction | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ProjectLifecycleAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const anyDialogOpen = deleteOpen || confirmingAction !== null;

  const reloadLatestRevision = () => {
    setError(null);
    setDeleteOpen(false);
    setConfirmingAction(null);
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
        });

        if (result.status === "error") {
          setError({
            code: result.code,
            message: isRevisionConflict(result.code)
              ? "Project đã thay đổi ở một phiên làm việc khác."
              : result.message,
          });
          return;
        }

        setConfirmingAction(null);
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
                  ? "Project đã thay đổi ở một phiên làm việc khác."
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

          {confirmingAction !== null ? errorAlert : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
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
