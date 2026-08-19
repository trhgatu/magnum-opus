import type { MemoryResponse } from "@repo/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMemory } from "@/features/memory/api/memory";
import { MemoryDetail } from "@/features/memory/components/memory-detail";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Memories",
  robots: {
    index: false,
    follow: false,
  },
};

interface MemoryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemoryDetailPage({
  params,
}: MemoryDetailPageProps) {
  const { id } = await params;

  let memory: MemoryResponse;

  try {
    memory = await getMemory(id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404)
    ) {
      notFound();
    }

    throw error;
  }

  return <MemoryDetail memory={memory} />;
}
