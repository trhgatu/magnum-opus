"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { JournalViewMode } from "./journal-editor-toolbar";

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
    <>
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
            onChange={(event) => onContentChange(event.target.value)}
            readOnly={!editable}
            autoFocus={editable}
            placeholder="Điều gì đang sống động lúc này?"
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
            <p className="text-muted-foreground">Entry này chưa có nội dung.</p>
          )}
        </div>
      )}
    </>
  );
}
