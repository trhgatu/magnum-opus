import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalEditor } from "@/features/journal/components/journal-editor";
import { getJournalEntry } from "@/features/journal/api/journal";
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
  let entry;
  try {
    entry = await getJournalEntry(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return <JournalEditor initialEntry={entry} />;
}
