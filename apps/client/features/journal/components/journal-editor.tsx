"use client";

import type { JournalEntryResponse } from "@repo/contracts";
import {
  ArrowLeft,
  Expand,
  Eye,
  LockKeyhole,
  Minimize2,
  PenLine,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  changeJournalEntryState,
  deleteJournalEntryPermanently,
  updateJournalEntry,
  type JournalLifecycleAction,
} from "@/features/journal/actions/journal";

type SaveState = "saved" | "saving" | "error" | "conflict";
type DraftSnapshot = { title: string | null; content: string };

const sameDraft = (left: DraftSnapshot, right: DraftSnapshot) =>
  left.title === right.title && left.content === right.content;

export function JournalEditor({
  initialEntry,
}: {
  initialEntry: JournalEntryResponse;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [title, setTitle] = useState(initialEntry.title ?? "");
  const [content, setContent] = useState(initialEntry.content);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<string>();
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<"write" | "preview">(
    initialEntry.state === "DRAFT" ? "write" : "preview",
  );
  const [isChangingState, setIsChangingState] = useState(false);

  const latestDraft = useRef<DraftSnapshot>({
    title: initialEntry.title,
    content: initialEntry.content,
  });
  const persistedDraft = useRef<DraftSnapshot>({
    title: initialEntry.title,
    content: initialEntry.content,
  });
  const [revisionNumber, setRevisionNumber] = useState(initialEntry.revision);
  const revision = useRef(initialEntry.revision);
  const activeSave = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    latestDraft.current = { title: title.trim() || null, content };
  }, [content, title]);

  const flush = useCallback((): Promise<boolean> => {
    if (entry.state !== "DRAFT") return Promise.resolve(true);

    if (activeSave.current) return activeSave.current;

    const saveLatest = async () => {
      while (!sameDraft(latestDraft.current, persistedDraft.current)) {
        const snapshot = { ...latestDraft.current };
        setSaveState("saving");
        setMessage(undefined);

        const result = await updateJournalEntry({
          id: entry.id,
          title: snapshot.title,
          content: snapshot.content,
          expectedRevision: revision.current,
        });

        if (result.status === "error") {
          const conflict = result.code === "JOURNAL_ENTRY_REVISION_CONFLICT";
          setSaveState(conflict ? "conflict" : "error");
          setMessage(
            conflict
              ? "Entry đã thay đổi ở nơi khác. Nội dung đang gõ vẫn được giữ; hãy tải lại để đối chiếu trước khi tiếp tục."
              : result.message,
          );
          return false;
        }

        revision.current = result.entry.revision;
        setRevisionNumber(result.entry.revision);
        persistedDraft.current = snapshot;
        setEntry(result.entry);
      }

      setSaveState("saved");
      return true;
    };

    const promise = saveLatest().finally(() => {
      activeSave.current = null;
    });
    activeSave.current = promise;
    return promise;
  }, [entry.id, entry.state]);

  useEffect(() => {
    if (
      entry.state !== "DRAFT" ||
      sameDraft(latestDraft.current, persistedDraft.current)
    )
      return;
    const timer = window.setTimeout(() => void flush(), 800);
    return () => window.clearTimeout(timer);
  }, [content, entry.state, flush, title]);

  const changeState = async (action: JournalLifecycleAction) => {
    setIsChangingState(true);
    setMessage(undefined);
    try {
      if (!(await flush())) return;
      const result = await changeJournalEntryState({
        id: entry.id,
        action,
        expectedRevision: revision.current,
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      revision.current = result.entry.revision;
      setRevisionNumber(result.entry.revision);
      setEntry(result.entry);
      setSaveState("saved");
      if (action === "seal") setViewMode("preview");
      if (action === "reopen" || action === "restore") setViewMode("write");
      if (action === "trash") router.push("/journal?state=TRASHED");
      else router.refresh();
    } finally {
      setIsChangingState(false);
    }
  };

  const deletePermanently = async () => {
    setIsChangingState(true);
    const result = await deleteJournalEntryPermanently({
      id: entry.id,
      expectedRevision: revision.current,
    });
    if (result.status === "error") {
      setMessage(result.message);
      setIsChangingState(false);
      return;
    }
    router.push("/journal?state=TRASHED");
    router.refresh();
  };

  const editable = entry.state === "DRAFT";
  const statusLabel =
    saveState === "saving"
      ? "Đang lưu…"
      : saveState === "saved"
        ? "Đã lưu"
        : saveState === "conflict"
          ? "Có xung đột"
          : "Lưu thất bại";

  return (
    <article
      className={
        focusMode
          ? "fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-6 sm:px-8"
          : ""
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="surface-glass sticky top-0 z-20 -mx-2 flex flex-wrap items-center gap-2 rounded-xl border px-2 py-2 shadow-sm">
          <Button
            type="button"
            onClick={() => router.push("/journal")}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />← Journal
          </Button>
          <Badge variant="outline">{entry.state}</Badge>
          <span
            aria-live="polite"
            className={
              "text-xs " +
              (saveState === "error" || saveState === "conflict"
                ? "text-destructive"
                : "text-muted-foreground")
            }
          >
            {editable ? statusLabel : "Chỉ đọc"} · revision {revisionNumber}
          </span>

          <div className="ml-auto flex flex-wrap gap-2">
            <div className="flex rounded-lg bg-muted p-0.5 text-sm">
              <Button
                type="button"
                onClick={() => setViewMode("write")}
                disabled={!editable}
                aria-pressed={viewMode === "write"}
                variant="ghost"
                size="sm"
                className="aria-pressed:bg-card aria-pressed:shadow-sm"
              >
                <PenLine aria-hidden="true" />
                Viết
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("preview")}
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
              onClick={() => setFocusMode((value) => !value)}
              variant="outline"
            >
              {focusMode ? (
                <Minimize2 aria-hidden="true" />
              ) : (
                <Expand aria-hidden="true" />
              )}
              {focusMode ? "Thoát focus" : "Focus"}
            </Button>
            {entry.state === "DRAFT" ? (
              <Button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("seal")}
                variant="outline"
              >
                <LockKeyhole aria-hidden="true" />
                Seal
              </Button>
            ) : null}
            {entry.state === "SEALED" ? (
              <Button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("reopen")}
                variant="outline"
              >
                <Undo2 aria-hidden="true" />
                Reopen
              </Button>
            ) : null}
            {entry.state !== "TRASHED" ? (
              <Button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("trash")}
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                Đưa vào Trash
              </Button>
            ) : null}
            {entry.state === "TRASHED" ? (
              <Button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("restore")}
                variant="outline"
              >
                <RotateCcw aria-hidden="true" />
                Khôi phục
              </Button>
            ) : null}
            {entry.state === "TRASHED" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isChangingState} variant="destructive">
                    <Trash2 aria-hidden="true" />
                    Xóa vĩnh viễn
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa vĩnh viễn entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Nội dung này sẽ biến mất khỏi Magnum Opus và không thể
                      khôi phục. Chỉ tiếp tục khi mày chắc chắn không còn cần
                      nó.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void deletePermanently()}
                    >
                      Xóa vĩnh viễn
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </header>

        {message ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{message}</AlertDescription>
            {saveState === "error" ? (
              <Button
                type="button"
                onClick={() => void flush()}
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-destructive"
              >
                Thử lưu lại
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <label className="sr-only" htmlFor="journal-title">
          Tiêu đề
        </label>
        <input
          id="journal-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={!editable}
          maxLength={200}
          placeholder="Tiêu đề không bắt buộc"
          className="font-display w-full bg-transparent text-4xl font-semibold tracking-[-0.025em] outline-none placeholder:text-muted-foreground/35 read-only:text-muted-foreground sm:text-5xl"
        />

        {viewMode === "write" ? (
          <>
            <label className="sr-only" htmlFor="journal-content">
              Nội dung
            </label>
            <textarea
              id="journal-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              readOnly={!editable}
              autoFocus={editable}
              placeholder="Điều gì đang sống động trong mày lúc này?"
              className="min-h-[55vh] w-full resize-none bg-transparent font-display text-lg leading-9 outline-none placeholder:text-muted-foreground/55 read-only:text-muted-foreground sm:text-xl"
            />
          </>
        ) : (
          <div
            aria-label="Bản xem trước nội dung"
            className="min-h-[55vh] font-display text-lg leading-9 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-5 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-5 [&_h1]:text-4xl [&_h1]:font-semibold [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-2xl [&_h3]:font-semibold [&_hr]:my-8 [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_ul]:list-disc sm:text-xl"
          >
            {content ? (
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            ) : (
              <p className="text-muted-foreground">
                Entry này chưa có nội dung.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
