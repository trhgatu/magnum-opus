import type { JournalEntryResponse, MoodResponse } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getJournalEntry } from "@/features/journal/api/journal";
import { JournalEditor } from "@/features/journal/components/journal-editor";
import { getMemories } from "@/features/memory/api/memory";
import { getMood } from "@/features/mood/api/mood";
import { ApiError } from "@/lib/api";
import type { MemoryResponse } from "@repo/contracts";

export const metadata: Metadata = {
  title: "Nhật ký",
  robots: { index: false, follow: false },
};

const LINKED_MEMORIES_LIMIT = 6;

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let entry: JournalEntryResponse;
  let mood: MoodResponse | null;
  let linkedMemories: PaginatedResult<MemoryResponse>;

  try {
    [entry, mood, linkedMemories] = await Promise.all([
      getJournalEntry(id),
      getMood(id),
      getMemories({
        sourceJournalEntryId: id,
        limit: LINKED_MEMORIES_LIMIT,
        sortBy: "occurredOn",
        sortOrder: "desc",
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <JournalEditor
      initialEntry={entry}
      initialMood={mood}
      linkedMemories={linkedMemories.data}
      linkedMemoriesTotal={linkedMemories.meta.totalItems}
    />
  );
}
