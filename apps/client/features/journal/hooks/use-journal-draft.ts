"use client";

import type { JournalEntryResponse } from "@repo/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  updateJournalEntry,
  type JournalMutationResult,
} from "@/features/journal/actions/journal";

export type JournalSaveState =
  | "saved"
  | "saving"
  | "error"
  | "conflict"
  | "missing"
  | "session"
  | "remote_state";

const terminalSaveStates = new Set<JournalSaveState>([
  "missing",
  "session",
  "remote_state",
]);

interface DraftSnapshot {
  title: string | null;
  content: string;
}

type SaveDraft = (input: {
  id: string;
  title: string | null;
  content: string;
  expectedRevision: number;
}) => Promise<JournalMutationResult>;

interface UseJournalDraftOptions {
  saveDraft?: SaveDraft;
}

const snapshotOf = (title: string, content: string): DraftSnapshot => ({
  title: title.trim() || null,
  content,
});

const snapshotOfEntry = (entry: JournalEntryResponse): DraftSnapshot => ({
  title: entry.title,
  content: entry.content,
});

const sameDraft = (left: DraftSnapshot, right: DraftSnapshot) =>
  left.title === right.title && left.content === right.content;

export function useJournalDraft(
  initialEntry: JournalEntryResponse,
  { saveDraft = updateJournalEntry }: UseJournalDraftOptions = {},
) {
  const [entry, setEntry] = useState(initialEntry);
  const [title, setTitleState] = useState(initialEntry.title ?? "");
  const [content, setContentState] = useState(initialEntry.content);
  const [saveState, setSaveState] = useState<JournalSaveState>("saved");
  const [message, setMessage] = useState<string>();
  const [revision, setRevision] = useState(initialEntry.revision);
  const [persistedSnapshot, setPersistedSnapshot] = useState(() =>
    snapshotOfEntry(initialEntry),
  );

  const latestDraft = useRef(snapshotOfEntry(initialEntry));
  const persistedDraft = useRef(snapshotOfEntry(initialEntry));
  const revisionRef = useRef(initialEntry.revision);
  const activeSave = useRef<Promise<boolean> | null>(null);

  const setTitle = useCallback((value: string) => {
    setTitleState(value);
    latestDraft.current = snapshotOf(value, latestDraft.current.content);
  }, []);

  const setContent = useCallback((value: string) => {
    setContentState(value);
    latestDraft.current = {
      title: latestDraft.current.title,
      content: value,
    };
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (terminalSaveStates.has(saveState)) return Promise.resolve(false);
    if (entry.state !== "DRAFT") return Promise.resolve(true);
    if (activeSave.current) return activeSave.current;

    const saveLatest = async () => {
      while (!sameDraft(latestDraft.current, persistedDraft.current)) {
        const snapshot = { ...latestDraft.current };
        setSaveState("saving");
        setMessage(undefined);

        let result: JournalMutationResult;
        try {
          result = await saveDraft({
            id: entry.id,
            title: snapshot.title,
            content: snapshot.content,
            expectedRevision: revisionRef.current,
          });
        } catch {
          setSaveState("error");
          setMessage(
            "Không thể gửi nội dung tới server. Phần đang gõ vẫn được giữ; hãy kiểm tra kết nối rồi thử lại.",
          );
          return false;
        }

        if (result.status === "error") {
          const conflict = result.code === "JOURNAL_ENTRY_REVISION_CONFLICT";
          const missing = result.code === "JOURNAL_ENTRY_NOT_FOUND";
          const sessionExpired = result.kind === "unauthenticated";
          setSaveState(
            conflict
              ? "conflict"
              : missing
                ? "missing"
                : sessionExpired
                  ? "session"
                  : "error",
          );
          setMessage(
            conflict
              ? "Entry đã thay đổi ở nơi khác. Nội dung đang gõ vẫn được giữ; hãy tải lại để đối chiếu trước khi tiếp tục."
              : missing
                ? "Entry không còn tồn tại trên server. Nội dung đang gõ vẫn được giữ trên màn hình."
                : sessionExpired
                  ? "Phiên đăng nhập đã hết hạn. Nội dung đang gõ vẫn được giữ trên màn hình."
                  : result.message,
          );
          return false;
        }

        revisionRef.current = result.entry.revision;
        setRevision(result.entry.revision);
        persistedDraft.current = snapshot;
        setPersistedSnapshot(snapshot);
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
  }, [entry.id, entry.state, saveDraft, saveState]);

  const acceptPersistedEntry = useCallback((next: JournalEntryResponse) => {
    const snapshot = snapshotOfEntry(next);
    revisionRef.current = next.revision;
    latestDraft.current = snapshot;
    persistedDraft.current = snapshot;
    setPersistedSnapshot(snapshot);
    setEntry(next);
    setTitleState(next.title ?? "");
    setContentState(next.content);
    setRevision(next.revision);
    setSaveState("saved");
    setMessage(undefined);
  }, []);

  const rebaseOnto = useCallback((next: JournalEntryResponse) => {
    const snapshot = snapshotOfEntry(next);
    revisionRef.current = next.revision;
    persistedDraft.current = snapshot;
    setPersistedSnapshot(snapshot);
    setEntry(next);
    setRevision(next.revision);
    setSaveState("saved");
    setMessage(undefined);
  }, []);

  const preserveLocalOnto = useCallback((next: JournalEntryResponse) => {
    const snapshot = snapshotOfEntry(next);
    revisionRef.current = next.revision;
    persistedDraft.current = snapshot;
    setPersistedSnapshot(snapshot);
    setEntry(next);
    setRevision(next.revision);
    setSaveState("remote_state");
    setMessage(
      "Entry đã đổi trạng thái ở nơi khác. Nội dung đang gõ vẫn được giữ trên màn hình để sao chép.",
    );
  }, []);

  const isDirty = !sameDraft(snapshotOf(title, content), persistedSnapshot);

  useEffect(() => {
    if (
      entry.state !== "DRAFT" ||
      !isDirty ||
      terminalSaveStates.has(saveState)
    )
      return;
    const timer = window.setTimeout(() => void flush(), 800);
    return () => window.clearTimeout(timer);
  }, [content, entry.state, flush, isDirty, saveState, title]);

  const getRevision = useCallback(() => revisionRef.current, []);

  return {
    entry,
    title,
    content,
    revision,
    saveState,
    message,
    isDirty,
    editable: entry.state === "DRAFT",
    setTitle,
    setContent,
    flush,
    retry: flush,
    getRevision,
    acceptPersistedEntry,
    rebaseOnto,
    preserveLocalOnto,
  };
}
