"use client";

import type { JournalEntryResponse } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  changeJournalEntryState,
  deleteJournalEntryPermanently,
  type JournalLifecycleAction,
} from "@/features/journal/actions/journal";
import { JournalEditorToolbar } from "@/features/journal/components/journal-editor-toolbar";
import type { JournalViewMode } from "@/features/journal/components/journal-editor-toolbar";
import { JournalEntryContent } from "@/features/journal/components/journal-entry-content";
import { useJournalDraft } from "@/features/journal/hooks/use-journal-draft";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";

export function JournalEditor({
  initialEntry,
}: {
  initialEntry: JournalEntryResponse;
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
  } = useJournalDraft(initialEntry);
  const [lifecycleMessage, setLifecycleMessage] = useState<string>();
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<JournalViewMode>(
    initialEntry.state === "DRAFT" ? "write" : "preview",
  );
  const [isChangingState, setIsChangingState] = useState(false);

  const message = lifecycleMessage ?? draftMessage;
  useUnsavedChangesWarning(isDirty);

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
          editable={editable}
          viewMode={viewMode}
          focusMode={focusMode}
          busy={isChangingState}
          onBack={() =>
            void flush().then((saved) => {
              if (saved) router.push("/journal");
            })
          }
          onViewModeChange={setViewMode}
          onToggleFocus={() => setFocusMode((value) => !value)}
          onChangeState={(action) => void changeState(action)}
          onDeletePermanently={() => void deletePermanently()}
        />

        {message ? (
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
      </div>
    </article>
  );
}
