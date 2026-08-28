import type { Metadata } from "next";
import { Gem } from "lucide-react";
import { notFound } from "next/navigation";

import { ContextHero } from "@/components/system/context-hero";
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
        title: source.title?.trim() || "Một ký ức từ Journal",
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
      <ContextHero
        id="new-memory-heading"
        icon={Gem}
        eyebrow="Reflection · Archive"
        title="Lưu một ký ức"
        description="Giữ lại một khoảnh khắc theo cách nó được nhớ: câu chuyện, cảm giác và thời điểm đã xảy ra."
      />

      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:px-8">
          New archive record
        </div>
        <div className="p-5 sm:p-8">
          <MemoryEditor creationSeed={creationSeed} />
        </div>
      </div>
    </section>
  );
}
