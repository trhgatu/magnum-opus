import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/system/page-heading";
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
      <PageHeading
        id="new-memory-heading"
        eyebrow="Reflection"
        title="Lưu một ký ức"
        description="Giữ lại một khoảnh khắc theo cách nó được nhớ: câu chuyện, cảm giác và thời điểm đã xảy ra."
      />

      <div className="mx-auto w-full max-w-3xl rounded-3xl border bg-card/55 p-5 shadow-sm sm:p-8">
        <MemoryEditor creationSeed={creationSeed} />
      </div>
    </section>
  );
}
