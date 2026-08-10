"use client";

import type { JournalEntryState } from "@repo/contracts";
import {
  ArrowLeft,
  Expand,
  Eye,
  LockKeyhole,
  Minimize2,
  PenLine,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JournalLifecycleAction } from "@/features/journal/actions/journal";
import type { JournalSaveState } from "@/features/journal/hooks/use-journal-draft";

export type JournalViewMode = "write" | "preview";

interface JournalEditorToolbarProps {
  state: JournalEntryState;
  revision: number;
  saveState: JournalSaveState;
  dirty: boolean;
  editable: boolean;
  viewMode: JournalViewMode;
  focusMode: boolean;
  busy: boolean;
  onBack: () => void;
  onSave: () => void;
  onViewModeChange: (mode: JournalViewMode) => void;
  onToggleFocus: () => void;
  onChangeState: (action: JournalLifecycleAction) => void;
  onDeletePermanently: () => void;
}

const saveStateLabel: Record<JournalSaveState, string> = {
  saving: "Đang lưu…",
  saved: "Đã lưu",
  conflict: "Có xung đột",
  error: "Lưu thất bại",
};

export function JournalEditorToolbar({
  state,
  revision,
  saveState,
  dirty,
  editable,
  viewMode,
  focusMode,
  busy,
  onBack,
  onSave,
  onViewModeChange,
  onToggleFocus,
  onChangeState,
  onDeletePermanently,
}: JournalEditorToolbarProps) {
  return (
    <header
      className={`surface-glass sticky z-20 -mx-2 flex flex-wrap items-center gap-2 rounded-xl border px-2 py-2 shadow-sm ${focusMode ? "top-0" : "top-17"}`}
    >
      <Button type="button" onClick={onBack} variant="ghost">
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Journal
      </Button>
      <Badge variant="outline">{state}</Badge>
      <span
        aria-live="polite"
        className={
          "order-3 w-full px-2 text-xs sm:order-none sm:w-auto sm:px-0 " +
          (saveState === "error" || saveState === "conflict"
            ? "text-destructive"
            : "text-muted-foreground")
        }
      >
        {editable ? saveStateLabel[saveState] : "Chỉ đọc"} · revision {revision}
      </span>

      <div className="ml-auto flex max-w-full items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
        <Button
          type="button"
          onClick={onSave}
          disabled={
            !editable ||
            !dirty ||
            saveState === "saving" ||
            saveState === "conflict" ||
            busy
          }
          variant="outline"
          aria-label="Lưu ngay"
          aria-keyshortcuts="Control+S Meta+S"
          title="Lưu ngay (Ctrl+S)"
        >
          <Save aria-hidden="true" />
          <span className="hidden sm:inline">Lưu ngay</span>
        </Button>
        <div className="flex shrink-0 rounded-lg bg-muted p-0.5 text-sm">
          <Button
            type="button"
            onClick={() => onViewModeChange("write")}
            disabled={!editable}
            aria-pressed={viewMode === "write"}
            variant="ghost"
            size="sm"
            className="aria-pressed:bg-card aria-pressed:shadow-sm"
            aria-keyshortcuts="Control+Shift+P Meta+Shift+P"
          >
            <PenLine aria-hidden="true" />
            Viết
          </Button>
          <Button
            type="button"
            onClick={() => onViewModeChange("preview")}
            aria-pressed={viewMode === "preview"}
            variant="ghost"
            size="sm"
            className="aria-pressed:bg-card aria-pressed:shadow-sm"
          >
            <Eye aria-hidden="true" />
            Xem trước
          </Button>
        </div>
        <Button
          type="button"
          onClick={onToggleFocus}
          variant="outline"
          className="shrink-0"
          aria-label={focusMode ? "Thoát focus" : "Focus"}
          aria-keyshortcuts="Control+Shift+F Meta+Shift+F"
          title="Bật hoặc tắt Focus (Ctrl+Shift+F)"
        >
          {focusMode ? (
            <Minimize2 aria-hidden="true" />
          ) : (
            <Expand aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {focusMode ? "Thoát focus" : "Focus"}
          </span>
        </Button>
        {state === "DRAFT" ? (
          <Button
            disabled={busy}
            type="button"
            onClick={() => onChangeState("seal")}
            variant="outline"
          >
            <LockKeyhole aria-hidden="true" />
            Seal
          </Button>
        ) : null}
        {state === "SEALED" ? (
          <Button
            disabled={busy}
            type="button"
            onClick={() => onChangeState("reopen")}
            variant="outline"
          >
            <Undo2 aria-hidden="true" />
            Reopen
          </Button>
        ) : null}
        {state !== "TRASHED" ? (
          <Button
            disabled={busy}
            type="button"
            onClick={() => onChangeState("trash")}
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
            Đưa vào Trash
          </Button>
        ) : null}
        {state === "TRASHED" ? (
          <Button
            disabled={busy}
            type="button"
            onClick={() => onChangeState("restore")}
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            Khôi phục
          </Button>
        ) : null}
        {state === "TRASHED" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={busy} variant="destructive">
                <Trash2 aria-hidden="true" />
                Xóa vĩnh viễn
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa vĩnh viễn entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  Nội dung này sẽ biến mất khỏi Magnum Opus và không thể khôi
                  phục. Chỉ tiếp tục khi nội dung này thực sự không còn cần
                  thiết.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={onDeletePermanently}
                >
                  Xóa vĩnh viễn
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </header>
  );
}
