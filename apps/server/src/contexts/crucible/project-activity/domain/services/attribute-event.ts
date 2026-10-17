import type { ActivityEvent } from '../activity-evidence';
import type { DeclarationTimeline } from '../declaration-timeline';

export type Attribution =
  | { inCycle: true; cycleId: string; label: 'ACTIVE' | 'PAUSED' }
  | { inCycle: false; position: 'BEFORE_START' | 'AFTER_CLOSE' };

/**
 * Event thuộc Cycle nào và lúc đó người dùng đang tuyên bố gì (02 §3.2).
 * Mỗi event được gắn độc lập theo thời điểm của chính nó: PR_OPENED và
 * PR_MERGED của cùng một PR có thể thuộc hai Cycle khác nhau.
 */
export function attributeEvent(
  event: Pick<ActivityEvent, 'occurredAt'>,
  timeline: DeclarationTimeline,
): Attribution {
  const segment = timeline.segmentAt(event.occurredAt);

  if (
    segment.cycleId !== null &&
    (segment.state === 'ACTIVE' || segment.state === 'PAUSED')
  ) {
    return { inCycle: true, cycleId: segment.cycleId, label: segment.state };
  }
  // PAUSED vẫn thuộc Cycle (DEC-PAC-004); NOT_STARTED và đã khép thì không.
  return {
    inCycle: false,
    position: segment.state === 'NOT_STARTED' ? 'BEFORE_START' : 'AFTER_CLOSE',
  };
}
