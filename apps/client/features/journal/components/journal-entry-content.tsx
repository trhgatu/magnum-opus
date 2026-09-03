"use client";

import dynamic from "next/dynamic";

import type { JournalViewMode } from "./journal-editor-toolbar";

const JournalMarkdownPreview = dynamic(
  () =>
    import("./journal-markdown-preview").then(
      (module) => module.JournalMarkdownPreview,
    ),
  {
    loading: () => (
      <div
        className="min-h-[55vh] animate-pulse rounded-2xl bg-muted/35"
        role="status"
        aria-label="Đang chuẩn bị bản xem trước"
      />
    ),
    ssr: false,
  },
);

interface JournalEntryContentProps {
  title: string;
  content: string;
  editable: boolean;
  viewMode: JournalViewMode;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export function JournalEntryContent({
  title,
  content,
  editable,
  viewMode,
  onTitleChange,
  onContentChange,
}: JournalEntryContentProps) {
  return (
    <div className="flex min-h-[58vh] flex-col">
      {/* Input phía dưới đã mang vai trò thị giác của tiêu đề trang, nhưng
          role="heading" không hợp lệ trên input (ARIA in HTML không cho phép
          ghi đè role của textbox) — thêm h1 ẩn để trang có đúng 1 heading
          cấp 1 mà screen reader điều hướng được. */}
      <h1 className="sr-only">{title || "Chưa đặt tiêu đề"}</h1>
      <label className="sr-only" htmlFor="journal-title">
        Tiêu đề
      </label>
      <input
        id="journal-title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        readOnly={!editable}
        maxLength={200}
        placeholder="Tiêu đề không bắt buộc"
        className="font-display w-full border-b border-border/70 bg-transparent pb-7 text-4xl font-semibold tracking-[-0.025em] outline-none placeholder:text-muted-foreground/35 read-only:text-muted-foreground sm:text-5xl"
      />

      {viewMode === "write" ? (
        <>
          <label className="sr-only" htmlFor="journal-content">
            Nội dung
          </label>
          <textarea
            id="journal-content"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            readOnly={!editable}
            autoFocus={editable}
            placeholder="Điều gì đang sống động lúc này?"
            className="mt-7 min-h-[48vh] w-full flex-1 resize-none bg-transparent font-display text-lg leading-9 outline-none placeholder:text-muted-foreground/55 read-only:text-muted-foreground sm:text-xl"
          />
        </>
      ) : (
        <JournalMarkdownPreview content={content} />
      )}
    </div>
  );
}
