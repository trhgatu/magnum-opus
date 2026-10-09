import { AggregateRoot } from '@shared/domain/aggregate-root';

import { RoutineLifecycleAction } from './enums';
import {
  RoutineHabitAddedEvent,
  RoutineHabitRemovedEvent,
  RoutineLifecycleTransitionedEvent,
} from './events';
import {
  InvalidRoutineHabitIdException,
  InvalidRoutineHabitReorderException,
  InvalidRoutineTitleException,
  InvalidRoutineTransitionException,
  RoutineHabitAlreadyExistsException,
  RoutineHabitNotFoundException,
} from './exceptions';

import { RoutineCalendarDate, RoutineId } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface RoutineProps {
  id: RoutineId;
  ownerId: string;
  title: string;
  habitIds: string[];
  isActive: boolean;
  revision: number;
  createdAt: Date;
  createdOn: RoutineCalendarDate;
  // effectiveOn của lifecycle transition mới nhất đã ghi — mốc sàn để
  // effectiveOn không bao giờ giảm khi owner đổi múi giờ về phía tây.
  // null = đã nạp, chưa có transition nào; undefined = không được nạp (vd
  // aggregate dựng từ reader chỉ để hiển thị) — khi đó cấm archive/restore.
  latestLifecycleEffectiveOn: RoutineCalendarDate | null | undefined;
  // Mốc hiệu lực mới nhất đã ghi trong lịch sử thành viên của TỪNG Habit
  // (max của addedOn/removedOn của cặp routine–habit đó) — mốc sàn để
  // addedOn/removedOn không bao giờ giảm (DAP-FTH-001). Habit chưa từng có
  // lịch sử thì không có trong map. undefined = không được nạp (reader) —
  // khi đó cấm thêm/gỡ Habit.
  membershipFloors: Map<string, RoutineCalendarDate> | undefined;
  updatedAt: Date;
}

export interface RoutinePrimitives {
  id: string;
  ownerId: string;
  title: string;
  habitIds: string[];
  isActive: boolean;
  revision: number;
  createdAt: Date;
  createdOn: string;
  updatedAt: Date;
}

export class Routine extends AggregateRoot {
  private constructor(private readonly props: RoutineProps) {
    super();
  }

  public static create(input: {
    ownerId: string;
    title: string;
    today: RoutineCalendarDate;
  }): Routine {
    const now = new Date();

    return new Routine({
      id: RoutineId.generate(),
      ownerId: input.ownerId,
      title: Routine.normalizeTitle(input.title),
      habitIds: [],
      isActive: true,
      revision: 1,
      createdAt: now,
      createdOn: input.today,
      latestLifecycleEffectiveOn: null,
      membershipFloors: new Map(),
      updatedAt: now,
    });
  }

  public static rehydrate(props: RoutineProps): Routine {
    return new Routine({
      ...props,
      habitIds: [...props.habitIds],
      membershipFloors: props.membershipFloors
        ? new Map(props.membershipFloors)
        : undefined,
    });
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get habitIds(): readonly string[] {
    return [...this.props.habitIds];
  }

  public get revision(): number {
    return this.props.revision;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get createdOn(): RoutineCalendarDate {
    return this.props.createdOn;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateTitle(title: string): void {
    this.ensureActive();

    const nextTitle = Routine.normalizeTitle(title);

    const changed = this.props.title !== nextTitle;

    if (!changed) {
      return;
    }

    this.props.title = nextTitle;
    this.trackChange();
  }

  public restore(today: RoutineCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (this.props.isActive) {
      throw new InvalidRoutineTransitionException(true);
    }

    this.props.isActive = true;
    this.trackChange();
    this.recordLifecycleTransition(RoutineLifecycleAction.RESTORED, today);
  }

  public archive(today: RoutineCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (!this.props.isActive) {
      throw new InvalidRoutineTransitionException(false);
    }
    this.props.isActive = false;
    this.trackChange();
    this.recordLifecycleTransition(RoutineLifecycleAction.ARCHIVED, today);
  }

  public toPrimitives(): RoutinePrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      title: this.props.title,
      isActive: this.props.isActive,
      revision: this.props.revision,
      habitIds: [...this.props.habitIds],
      createdAt: this.props.createdAt,
      createdOn: this.props.createdOn.value,
      updatedAt: this.props.updatedAt,
    };
  }
  public addHabit(habitId: string, today: RoutineCalendarDate): void {
    this.ensureActive();

    const normalizedHabitId = Routine.normalizeHabitId(habitId);

    if (this.props.habitIds.includes(normalizedHabitId)) {
      throw new RoutineHabitAlreadyExistsException(normalizedHabitId);
    }

    this.ensureMembershipFloorsLoaded();

    this.props.habitIds.push(normalizedHabitId);
    this.trackChange();
    this.addDomainEvent(
      new RoutineHabitAddedEvent(
        this.props.id.value,
        this.props.ownerId,
        normalizedHabitId,
        this.nextMembershipDate(normalizedHabitId, today),
      ),
    );
  }

  public removeHabit(habitId: string, today: RoutineCalendarDate): void {
    this.ensureActive();

    const normalizedHabitId = Routine.normalizeHabitId(habitId);
    const habitIndex = this.props.habitIds.indexOf(normalizedHabitId);

    if (habitIndex === -1) {
      throw new RoutineHabitNotFoundException(normalizedHabitId);
    }

    this.ensureMembershipFloorsLoaded();

    this.props.habitIds.splice(habitIndex, 1);
    this.trackChange();
    this.addDomainEvent(
      new RoutineHabitRemovedEvent(
        this.props.id.value,
        this.props.ownerId,
        normalizedHabitId,
        this.nextMembershipDate(normalizedHabitId, today),
      ),
    );
  }

  public reorderHabits(habitIds: string[]): void {
    this.ensureActive();

    const normalizedHabitIds = habitIds.map((habitId) =>
      Routine.normalizeHabitId(habitId),
    );
    const currentHabitIds = this.props.habitIds;

    const isSamePermutation =
      normalizedHabitIds.length === currentHabitIds.length &&
      new Set(normalizedHabitIds).size === currentHabitIds.length &&
      currentHabitIds.every((habitId) => normalizedHabitIds.includes(habitId));

    if (!isSamePermutation) {
      throw new InvalidRoutineHabitReorderException();
    }

    const unchanged = normalizedHabitIds.every(
      (habitId, index) => habitId === currentHabitIds[index],
    );

    if (unchanged) {
      return;
    }

    this.props.habitIds = normalizedHabitIds;
    this.trackChange();
  }

  public moveHabitUp(habitId: string): void {
    this.moveHabit(habitId, -1);
  }

  public moveHabitDown(habitId: string): void {
    this.moveHabit(habitId, 1);
  }

  private ensureActive(): void {
    if (!this.props.isActive) {
      throw new InvalidRoutineTransitionException(false);
    }
  }
  private static normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || [...normalizedTitle].length > MAX_TITLE_LENGTH) {
      throw new InvalidRoutineTitleException();
    }
    return normalizedTitle;
  }

  private static normalizeHabitId(habitId: string): string {
    const normalizedHabitId = habitId.trim();

    if (!normalizedHabitId) {
      throw new InvalidRoutineHabitIdException();
    }

    return normalizedHabitId;
  }

  private trackChange(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  // Lỗi lập trình, không phải lỗi nghiệp vụ: archive/restore trên aggregate
  // không nạp mốc sàn sẽ lặng lẽ bỏ qua quy tắc mốc hiệu lực không giảm.
  private ensureLifecycleFloorLoaded(): void {
    if (this.props.latestLifecycleEffectiveOn === undefined) {
      throw new Error(
        'Routine lifecycle floor was not loaded; load the Routine through RoutineRepository before archive/restore',
      );
    }
  }

  // Lỗi lập trình, giống ensureLifecycleFloorLoaded: thêm/gỡ Habit trên
  // aggregate không nạp mốc sàn sẽ bỏ qua quy tắc mốc hiệu lực không giảm.
  private ensureMembershipFloorsLoaded(): void {
    if (this.props.membershipFloors === undefined) {
      throw new Error(
        'Routine membership floors were not loaded; load the Routine through RoutineRepository before adding/removing Habits',
      );
    }
  }

  // Ngày hiệu lực cho 1 lần thêm/gỡ Habit: không sớm hơn mốc mới nhất của
  // chính cặp routine–habit đó, cũng không sớm hơn createdOn (DAP-FTH-001).
  private nextMembershipDate(
    habitId: string,
    today: RoutineCalendarDate,
  ): RoutineCalendarDate {
    this.ensureMembershipFloorsLoaded();

    // Đã được đảm bảo ở dòng trên — không có nhánh dự phòng nào để một
    // aggregate chưa nạp mốc sàn lặng lẽ trở thành "đã nạp".
    const floors = this.props.membershipFloors as Map<
      string,
      RoutineCalendarDate
    >;
    const floor = RoutineCalendarDate.latest(
      this.props.createdOn,
      floors.get(habitId) ?? null,
    );
    const effectiveOn = RoutineCalendarDate.latest(today, floor);

    floors.set(habitId, effectiveOn);

    return effectiveOn;
  }

  // Mốc hiệu lực không bao giờ giảm (DAP-FTH-001): nếu "hôm nay" theo múi
  // giờ hiện tại sớm hơn mốc đã ghi, transition được kẹp về mốc đó. Chuỗi
  // lifecycle bắt đầu từ createdOn nên createdOn cũng là mốc sàn.
  private recordLifecycleTransition(
    action: RoutineLifecycleAction,
    today: RoutineCalendarDate,
  ): void {
    const floor = RoutineCalendarDate.latest(
      this.props.createdOn,
      this.props.latestLifecycleEffectiveOn ?? null,
    );
    const effectiveOn = RoutineCalendarDate.latest(today, floor);

    this.props.latestLifecycleEffectiveOn = effectiveOn;
    this.addDomainEvent(
      new RoutineLifecycleTransitionedEvent(
        this.props.id.value,
        this.props.ownerId,
        action,
        effectiveOn,
      ),
    );
  }

  private moveHabit(habitId: string, offset: -1 | 1): void {
    this.ensureActive();

    const normalizedHabitId = Routine.normalizeHabitId(habitId);
    const currentIndex = this.props.habitIds.indexOf(normalizedHabitId);

    if (currentIndex === -1) {
      throw new RoutineHabitNotFoundException(normalizedHabitId);
    }

    const targetIndex = currentIndex + offset;

    if (targetIndex < 0 || targetIndex >= this.props.habitIds.length) {
      return;
    }

    const targetHabitId = this.props.habitIds[targetIndex];

    this.props.habitIds[targetIndex] = normalizedHabitId;
    this.props.habitIds[currentIndex] = targetHabitId;
    this.trackChange();
  }
}
