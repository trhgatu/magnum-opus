"use client";

import type { JournalEntryResponse, MoodResponse } from "@repo/contracts";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  changeJournalEntryState,
  deleteJournalEntryPermanently,
  reloadJournalEntry,
  type JournalLifecycleAction,
} from "@/features/journal/actions/journal";
import { JournalConflictAlert } from "@/features/journal/components/journal-conflict-alert";
import { JournalDraftRecoveryAlert } from "@/features/journal/components/journal-draft-recovery-alert";
import { JournalEditorToolbar } from "@/features/journal/components/journal-editor-toolbar";
import type { JournalViewMode } from "@/features/journal/components/journal-editor-toolbar";
import { JournalEntryContent } from "@/features/journal/components/journal-entry-content";
import { useJournalDraft } from "@/features/journal/hooks/use-journal-draft";
import { useJournalEditorShortcuts } from "@/features/journal/hooks/use-journal-editor-shortcuts";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";

const MoodPanel = dynamic(
  () =>
    import("@/features/mood/components/mood-panel").then(
      (module) => module.MoodPanel,
    ),
  {
    loading: () => (
      <div
        className="h-32 animate-pulse rounded-xl bg-muted/35"
        role="status"
        aria-label="Đang chuẩn bị Mood"
      />
    ),
  },
);

export function JournalEditor({
  initialEntry,
  initialMood,
}: {
  initialEntry: JournalEntryResponse;
  initialMood: MoodResponse | null;
}) {
  const router = useRouter();
  const {
    entry,
    title,
    content,
    revision,
    saveState,
    message: draftMessage,
    isDirty,
    editable,
    setTitle,
    setContent,
    flush,
    retry,
    getRevision,
    acceptPersistedEntry,
    rebaseOnto,
    preserveLocalOnto,
  } = useJournalDraft(initialEntry);
  const [lifecycleMessage, setLifecycleMessage] = useState<string>();
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<JournalViewMode>(
    initialEntry.state === "DRAFT" ? "write" : "preview",
  );
  const [isChangingState, setIsChangingState] = useState(false);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [isMoodBusy, setIsMoodBusy] = useState(false);

  const message = lifecycleMessage ?? draftMessage;
  const lifecycleBusy = isChangingState || isResolvingConflict;
  const busy = lifecycleBusy || isMoodBusy;
  const recoveryReason =
    saveState === "missing" ||
    saveState === "session" ||
    saveState === "remote_state"
      ? saveState
      : undefined;
  useUnsavedChangesWarning(isDirty);

  const saveNow = useCallback(() => {
    setLifecycleMessage(undefined);
    void flush();
  }, [flush]);

  const togglePreview = useCallback(() => {
    setViewMode((current) =>
      current === "preview" && editable ? "write" : "preview",
    );
  }, [editable]);

  const toggleFocus = useCallback(() => {
    setFocusMode((current) => !current);
  }, []);

  const exitFocus = useCallback(() => setFocusMode(false), []);

  useJournalEditorShortcuts({
    enabled: editable && !busy && saveState !== "conflict" && !recoveryReason,
    focusMode,
    onSave: saveNow,
    onTogglePreview: togglePreview,
    onToggleFocus: toggleFocus,
    onExitFocus: exitFocus,
  });

  const resolveConflict = async (keepLocal: boolean) => {
    setIsResolvingConflict(true);
    setLifecycleMessage(undefined);
    try {
      const result = await reloadJournalEntry(entry.id);
      if (result.status === "error") {
        setLifecycleMessage(result.message);
        return;
      }

      if (!keepLocal) {
        acceptPersistedEntry(result.entry);
        setViewMode(result.entry.state === "DRAFT" ? "write" : "preview");
        return;
      }

      if (result.entry.state !== "DRAFT") {
        preserveLocalOnto(result.entry);
        setViewMode("preview");
        return;
      }

      rebaseOnto(result.entry);
      await flush();
    } finally {
      setIsResolvingConflict(false);
    }
  };

  const changeState = async (action: JournalLifecycleAction) => {
    setIsChangingState(true);
    setLifecycleMessage(undefined);
    try {
      if (!(await flush())) return;
      const result = await changeJournalEntryState({
        id: entry.id,
        action,
        expectedRevision: getRevision(),
      });
      if (result.status === "error") {
        setLifecycleMessage(result.message);
        return;
      }
      acceptPersistedEntry(result.entry);
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
      expectedRevision: getRevision(),
    });
    if (result.status === "error") {
      setLifecycleMessage(result.message);
      setIsChangingState(false);
      return;
    }
    router.push("/journal?state=TRASHED");
    router.refresh();
  };

  return (
    <article
      className={
        focusMode
          ? "fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-6 sm:px-8"
          : ""
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <JournalEditorToolbar
          state={entry.state}
          revision={revision}
          saveState={saveState}
          dirty={isDirty}
          editable={editable}
          viewMode={viewMode}
          focusMode={focusMode}
          busy={busy}
          onBack={() =>
            void flush().then((saved) => {
              if (saved) router.push("/journal");
            })
          }
          onSave={saveNow}
          onViewModeChange={setViewMode}
          onToggleFocus={toggleFocus}
          onChangeState={(action) => void changeState(action)}
          onDeletePermanently={() => void deletePermanently()}
        />

        {recoveryReason ? (
          <JournalDraftRecoveryAlert
            reason={recoveryReason}
            entryId={entry.id}
            title={title}
            content={content}
          />
        ) : saveState === "conflict" ? (
          <JournalConflictAlert
            busy={isResolvingConflict}
            recoveryError={lifecycleMessage}
            onUseLatest={() => void resolveConflict(false)}
            onKeepLocal={() => void resolveConflict(true)}
          />
        ) : message ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{message}</AlertDescription>
            {saveState === "error" ? (
              <Button
                type="button"
                onClick={() => void retry()}
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-destructive"
              >
                Thử lưu lại
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <JournalEntryContent
          title={title}
          content={content}
          editable={editable}
          viewMode={viewMode}
          onTitleChange={setTitle}
          onContentChange={setContent}
        />

        <MoodPanel
          key={`${initialMood?.id ?? "none"}:${initialMood?.revision ?? 0}:${entry.state}`}
          journalEntryId={entry.id}
          initialMood={initialMood}
          editable={editable}
          disabled={lifecycleBusy}
          onBusyChange={setIsMoodBusy}
        />
      </div>
    </article>
  );
}
