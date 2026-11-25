import type { MemoryResponse } from "@repo/contracts";

import type { MemorySortField } from "@/features/memory/lib/memory-url";

export interface MemoryGroup {
  /** Năm xảy ra, hay "Chưa rõ ngày"; null khi danh sách không xếp theo ngày xảy ra. */
  label: string | null;
  memories: MemoryResponse[];
}

const UNDATED = "Chưa rõ ngày";

/**
 * Nhóm ký ức theo năm xảy ra, giữ nguyên thứ tự server trả về. Chỉ nhóm khi
 * danh sách xếp theo thời điểm xảy ra; xếp theo ngày lưu hay lần sửa thì năm
 * xảy ra không theo thứ tự, nên trả một nhóm không nhãn.
 */
export function groupMemoriesByYear(
  memories: readonly MemoryResponse[],
  sortBy: MemorySortField,
): MemoryGroup[] {
  if (sortBy !== "occurredOn")
    return [{ label: null, memories: [...memories] }];

  const groups: MemoryGroup[] = [];
  for (const memory of memories) {
    const label =
      memory.occurredOnPrecision === "UNKNOWN" || !memory.occurredOn
        ? UNDATED
        : memory.occurredOn.slice(0, 4);
    const last = groups.at(-1);
    if (last?.label === label) last.memories.push(memory);
    else groups.push({ label, memories: [memory] });
  }
  return groups;
}
