"use client";

import { useEffect } from "react";

interface JournalEditorShortcuts {
  enabled: boolean;
  focusMode: boolean;
  onSave: () => void;
  onTogglePreview: () => void;
  onToggleFocus: () => void;
  onExitFocus: () => void;
}

export function useJournalEditorShortcuts({
  enabled,
  focusMode,
  onSave,
  onTogglePreview,
  onToggleFocus,
  onExitFocus,
}: JournalEditorShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && !event.shiftKey && key === "s" && enabled) {
        event.preventDefault();
        onSave();
        return;
      }

      if (modifier && event.shiftKey && key === "p") {
        event.preventDefault();
        onTogglePreview();
        return;
      }

      if (modifier && event.shiftKey && key === "f") {
        event.preventDefault();
        onToggleFocus();
        return;
      }

      if (event.key === "Escape" && focusMode) {
        event.preventDefault();
        onExitFocus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, focusMode, onExitFocus, onSave, onToggleFocus, onTogglePreview]);
}
