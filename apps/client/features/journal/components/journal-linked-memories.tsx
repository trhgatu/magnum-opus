import type { MemoryResponse } from "@repo/contracts";
import { Gem } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/features/memory/components/memory-card";

interface JournalLinkedMemoriesProps {
  memories: MemoryResponse[];
  totalCount: number;
  canCreateMemory: boolean;
  createDisabled: boolean;
  onCreateMemory: () => void;
}

export function JournalLinkedMemories({
  memories,
  totalCount,
  canCreateMemory,
  createDisabled,
  onCreateMemory,
}: JournalLinkedMemoriesProps) {
  return (
    <section
      className="flex flex-col gap-4 border-t pt-6"
      aria-labelledby="journal-linked-memories-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="journal-linked-memories-heading"
          className="flex items-center gap-2 font-display text-lg font-semibold"
        >
          <Gem className="size-4 text-primary" aria-hidden="true" />
          Ký ức từ entry này
        </h2>

        {canCreateMemory ? (
          <Button
            type="button"
            onClick={onCreateMemory}
            disabled={createDisabled}
            variant="outline"
            size="sm"
          >
            <Gem aria-hidden="true" />
            Giữ lại như ký ức
          </Button>
        ) : null}
      </div>

      {memories.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
          {totalCount > memories.length ? (
            <p className="text-sm text-muted-foreground">
              và {totalCount - memories.length} ký ức khác từ entry này.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có ký ức nào được lưu từ entry này.
        </p>
      )}
    </section>
  );
}
