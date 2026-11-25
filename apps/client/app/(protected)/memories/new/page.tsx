import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getJournalEntry } from "@/features/journal/api/journal";
import { MemoryEditor } from "@/features/memory/components/memory-editor";
import type { MemoryCreationSeed } from "@/features/memory/components/memory-editor";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Lưu một ký ức",
  robots: {
    index: false,
    follow: false,
  },
};

interface NewMemoryPageProps {
  searchParams: Promise<{
    sourceJournalEntryId?: string | string[];
  }>;
}

export default async function NewMemoryPage({
  searchParams,
}: NewMemoryPageProps) {
  const rawSourceId = (await searchParams).sourceJournalEntryId;
  const sourceJournalEntryId =
    typeof rawSourceId === "string" ? rawSourceId : undefined;

  let creationSeed: MemoryCreationSeed | undefined;

  if (sourceJournalEntryId) {
    try {
      const source = await getJournalEntry(sourceJournalEntryId);

      if (source.state === "TRASHED") {
        notFound();
      }

      creationSeed = {
        sourceJournalEntryId: source.id,
        title: source.title?.trim() || "Một ký ức từ Nhật ký",
        content: source.content,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        notFound();
      }

      throw error;
    }
  }

  return (
    <section
      className="flex flex-col gap-8"
      aria-labelledby="new-memory-heading"
    >
      <Link
        href="/memories"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Tất cả ký ức
      </Link>

      <header className="flex max-w-3xl flex-col gap-2.5">
        <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Reflection · Ký ức mới
        </p>
        <h1
          id="new-memory-heading"
          className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] sm:text-[46px]"
        >
          Lưu một ký ức
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Giữ lại một khoảnh khắc theo cách nó được nhớ: câu chuyện, cảm giác và
          thời điểm đã xảy ra.
        </p>
      </header>

      <div className="w-full max-w-3xl">
        <MemoryEditor creationSeed={creationSeed} />
      </div>
    </section>
  );
}
