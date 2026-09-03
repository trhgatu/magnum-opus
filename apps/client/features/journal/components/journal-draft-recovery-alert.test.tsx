// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JournalDraftRecoveryAlert,
  journalDraftText,
} from "./journal-draft-recovery-alert";

afterEach(cleanup);

describe("JournalDraftRecoveryAlert", () => {
  it("formats a recoverable Markdown document", () => {
    expect(journalDraftText("  A title  ", "Body")).toBe("# A title\n\nBody");
    expect(journalDraftText("   ", "Body")).toBe("Body");
  });

  it("copies the preserved local draft", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <JournalDraftRecoveryAlert
        reason="missing"
        entryId="entry-id"
        title="A title"
        content="Body"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sao chép nội dung" }));

    expect(
      await screen.findByRole("button", { name: "Đã sao chép" }),
    ).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith("# A title\n\nBody");
  });
});
