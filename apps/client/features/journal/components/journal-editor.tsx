"use client";

import type { JournalEntryResponse } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    if (
      !window.confirm(
        "Xóa vĩnh viễn entry này? Hành động này không thể hoàn tác.",
      )
    )
      return;
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
          ? "fixed inset-0 z-50 overflow-y-auto bg-white px-4 py-6 dark:bg-zinc-950 sm:px-8"
          : ""
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => router.push("/journal")}
            className="rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            ← Journal
          </button>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-900">
            {entry.state}
          </span>
          <span
            aria-live="polite"
            className={
              "text-xs " +
              (saveState === "error" || saveState === "conflict"
                ? "text-red-700 dark:text-red-400"
                : "text-zinc-500")
            }
          >
            {editable ? statusLabel : "Chỉ đọc"} · revision {revisionNumber}
          </span>

          <div className="ml-auto flex flex-wrap gap-2">
            <div className="flex rounded-md bg-zinc-100 p-0.5 text-sm dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setViewMode("write")}
                disabled={!editable}
                aria-pressed={viewMode === "write"}
                className="rounded px-2.5 py-1 aria-pressed:bg-white aria-pressed:shadow-sm disabled:opacity-40 dark:aria-pressed:bg-zinc-800"
              >
                Viết
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                aria-pressed={viewMode === "preview"}
                className="rounded px-2.5 py-1 aria-pressed:bg-white aria-pressed:shadow-sm dark:aria-pressed:bg-zinc-800"
              >
                Xem trước
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFocusMode((value) => !value)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {focusMode ? "Thoát focus" : "Focus"}
            </button>
            {entry.state === "DRAFT" ? (
              <button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("seal")}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Seal
              </button>
            ) : null}
            {entry.state === "SEALED" ? (
              <button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("reopen")}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Reopen
              </button>
            ) : null}
            {entry.state !== "TRASHED" ? (
              <button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("trash")}
                className="rounded-md px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Đưa vào Trash
              </button>
            ) : null}
            {entry.state === "TRASHED" ? (
              <button
                disabled={isChangingState}
                type="button"
                onClick={() => void changeState("restore")}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Khôi phục
              </button>
            ) : null}
            {entry.state === "TRASHED" ? (
              <button
                disabled={isChangingState}
                type="button"
                onClick={() => void deletePermanently()}
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                Xóa vĩnh viễn
              </button>
            ) : null}
          </div>
        </header>

        {message ? (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {message}
            {saveState === "error" ? (
              <button
                type="button"
                onClick={() => void flush()}
                className="ml-2 font-semibold underline"
              >
                Thử lưu lại
              </button>
            ) : null}
          </div>
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
          className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-zinc-300 read-only:text-zinc-600 dark:placeholder:text-zinc-700 dark:read-only:text-zinc-400"
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
              className="min-h-[55vh] w-full resize-none bg-transparent text-base leading-8 outline-none placeholder:text-zinc-400 read-only:text-zinc-700 dark:read-only:text-zinc-300"
            />
          </>
        ) : (
          <div
            aria-label="Bản xem trước nội dung"
            className="min-h-[55vh] text-base leading-8 text-zinc-800 [&_a]:text-amber-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_h1]:mb-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-8 [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-4 [&_ul]:list-disc dark:text-zinc-200 dark:[&_a]:text-amber-400 dark:[&_code]:bg-zinc-900 dark:[&_pre]:bg-zinc-900"
          >
            {content ? (
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            ) : (
              <p className="text-zinc-400">Entry này chưa có nội dung.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
