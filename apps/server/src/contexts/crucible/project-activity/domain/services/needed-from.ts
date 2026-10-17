import type { DeclarationTimeline } from '../declaration-timeline';

/**
 * Sổ của một nguồn cần phủ từ đâu để trả lời được Project (BR-PAC-016):
 * từ lúc Cycle đang mở bắt đầu; từ lúc Cycle cuối khép nếu Project đã khép
 * (để thấy D3); từ lúc gắn nếu chưa từng có Cycle (để thấy D4).
 */
export function neededFrom(
  timeline: DeclarationTimeline,
  linkedAt: Date,
): Date {
  const cycleId = timeline.currentCycleId;
  if (cycleId) {
    const start = timeline.segmentsOfCycle(cycleId)[0]?.from;
    if (start) return start;
  }
  return timeline.lastCycleClose() ?? linkedAt;
}
