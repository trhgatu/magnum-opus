import type { ProjectLifecycleState } from '@repo/contracts';

/** Một lần chuyển trạng thái, như lịch sử bất biến của Project ghi lại. */
export interface LifecycleTransition {
  fromState: ProjectLifecycleState;
  toState: ProjectLifecycleState;
  occurredAt: Date;
  /** Cycle mà lần chuyển này thuộc về (Start/Reopen mở Cycle mới). */
  cycleId: string | null;
}

/** Một khoảng nửa mở [from, to) mà lời tuyên bố không đổi. */
export interface DeclarationSegment {
  state: ProjectLifecycleState;
  /** Cycle đang mở trong khoảng này; null khi NOT_STARTED/STOPPED/COMPLETED. */
  cycleId: string | null;
  /** null: từ trước mọi lần chuyển. */
  from: Date | null;
  /** null: tới hiện tại. */
  to: Date | null;
}

const OPEN_STATES: ReadonlySet<ProjectLifecycleState> = new Set([
  'ACTIVE',
  'PAUSED',
]);
const CLOSED_STATES: ReadonlySet<ProjectLifecycleState> = new Set([
  'STOPPED',
  'COMPLETED',
]);

/**
 * Dòng thời gian liên tục của lời tuyên bố, dựng từ lịch sử chuyển trạng
 * thái (02 §3.1). Mỗi thời điểm thuộc đúng một khoảng.
 */
export class DeclarationTimeline {
  private constructor(
    private readonly transitions: LifecycleTransition[],
    private readonly ownSegments: DeclarationSegment[],
  ) {}

  static fromTransitions(
    transitions: readonly LifecycleTransition[],
  ): DeclarationTimeline {
    // Bản sao của input: thay đổi bên ngoài không làm hỏng dòng thời gian.
    const ordered = transitions
      .map((transition) => ({
        ...transition,
        occurredAt: new Date(transition.occurredAt),
      }))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const segments: DeclarationSegment[] = [];
    let current: DeclarationSegment = {
      state: 'NOT_STARTED',
      cycleId: null,
      from: null,
      to: null,
    };
    for (const transition of ordered) {
      segments.push({ ...current, to: transition.occurredAt });
      current = {
        state: transition.toState,
        // Pause/Resume giữ Cycle đang mở; Start/Reopen mang Cycle mới.
        cycleId: OPEN_STATES.has(transition.toState)
          ? (transition.cycleId ?? current.cycleId)
          : null,
        from: transition.occurredAt,
        to: null,
      };
    }
    segments.push(current);

    return new DeclarationTimeline(ordered, segments);
  }

  /** Bản sao: sửa nó không đổi được dòng thời gian. */
  get segments(): DeclarationSegment[] {
    return this.ownSegments.map(copySegment);
  }

  get currentState(): ProjectLifecycleState {
    return this.lastSegment.state;
  }

  /** Cycle đang mở bây giờ; null khi Project không ở ACTIVE/PAUSED. */
  get currentCycleId(): string | null {
    return this.lastSegment.cycleId;
  }

  private get lastSegment(): DeclarationSegment {
    return this.ownSegments[this.ownSegments.length - 1];
  }

  /** Khoảng chứa `instant`; đúng lúc chuyển trạng thái thuộc khoảng mới. */
  segmentAt(instant: Date): DeclarationSegment {
    const time = instant.getTime();
    const segment = this.ownSegments.find(
      (candidate) =>
        (candidate.from === null || candidate.from.getTime() <= time) &&
        (candidate.to === null || time < candidate.to.getTime()),
    );
    // Các khoảng phủ kín trục thời gian.
    return copySegment(segment ?? this.lastSegment);
  }

  segmentsOfCycle(cycleId: string): DeclarationSegment[] {
    return this.ownSegments
      .filter((segment) => segment.cycleId === cycleId)
      .map(copySegment);
  }

  /** Lần gần nhất Project vào một trong các trạng thái; null nếu chưa từng. */
  lastEntryInto(states: readonly ProjectLifecycleState[]): Date | null {
    for (let i = this.transitions.length - 1; i >= 0; i--) {
      if (states.includes(this.transitions[i].toState)) {
        return new Date(this.transitions[i].occurredAt);
      }
    }
    return null;
  }

  /**
   * Lần gần nhất một Cycle thực sự khép (Stop/Complete từ ACTIVE/PAUSED).
   * Stop từ NOT_STARTED không khép Cycle nào.
   */
  lastCycleClose(): Date | null {
    for (let i = this.transitions.length - 1; i >= 0; i--) {
      const transition = this.transitions[i];
      if (
        CLOSED_STATES.has(transition.toState) &&
        OPEN_STATES.has(transition.fromState)
      ) {
        return new Date(transition.occurredAt);
      }
    }
    return null;
  }
}

const copySegment = (segment: DeclarationSegment): DeclarationSegment => ({
  ...segment,
  from: segment.from ? new Date(segment.from) : null,
  to: segment.to ? new Date(segment.to) : null,
});
