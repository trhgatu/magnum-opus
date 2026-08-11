import type { JournalEntryResponse, MoodResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getJournalEntry } from "@/features/journal/api/journal";
import { JournalEditor } from "@/features/journal/components/journal-editor";
import { getMood } from "@/features/mood/api/mood";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Journal entry",
  robots: { index: false, follow: false },
};

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let entry: JournalEntryResponse;
  let mood: MoodResponse | null;

  try {
    [entry, mood] = await Promise.all([getJournalEntry(id), getMood(id)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return <JournalEditor initialEntry={entry} initialMood={mood} />;
}
