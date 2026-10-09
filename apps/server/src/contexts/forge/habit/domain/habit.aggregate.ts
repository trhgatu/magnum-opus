import { AggregateRoot } from '@shared/domain/aggregate-root';

import { HabitFrequencyType, HabitLifecycleAction, HabitType } from './enums';
import { HabitLifecycleTransitionedEvent } from './events';
import {
  InvalidHabitTitleException,
  InvalidHabitTransitionException,
  InvalidHabitTypeException,
  InvalidQuitStartedAtException,
} from './exceptions';
import { HabitCalendarDate, HabitFrequency, HabitId } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface HabitProps {
  id: HabitId;
  ownerId: string;
  title: string;
  description: string | null;
  type: HabitType;
  frequency: HabitFrequency | null;
  quitStartedAt: Date | null;
  isActive: boolean;
  revision: number;
  createdAt: Date;
  createdOn: HabitCalendarDate;
  // effectiveOn của lifecycle transition mới nhất đã ghi — mốc sàn để
  // effectiveOn không bao giờ giảm khi owner đổi múi giờ về phía tây.
  // null = đã nạp, chưa có transition nào; undefined = không được nạp (vd
  // aggregate dựng từ reader chỉ để hiển thị) — khi đó cấm archive/restore.
  latestLifecycleEffectiveOn: HabitCalendarDate | null | undefined;
  updatedAt: Date;
}

export interface HabitPrimitives {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  type: HabitType;
  frequencyType: HabitFrequencyType | null;
  frequencyDays: number[];
  quitStartedAt: Date | null;
  isActive: boolean;
  revision: number;
  createdAt: Date;
  createdOn: string;
  updatedAt: Date;
}

interface TypeScopedFields {
  frequency: HabitFrequency | null;
  quitStartedAt: Date | null;
}

export class Habit extends AggregateRoot {
  private constructor(private readonly props: HabitProps) {
    super();
  }

  public static create(input: {
    ownerId: string;
    title: string;
    description?: string | null;
    type: HabitType;
    frequency?: HabitFrequency | null;
    quitStartedAt?: Date | null;
    today: HabitCalendarDate;
  }): Habit {
    const now = new Date();
    const { frequency, quitStartedAt } = Habit.resolveFieldsForCreate(
      input.type,
      input.frequency ?? null,
      input.quitStartedAt ?? null,
      now,
    );

    return new Habit({
      id: HabitId.generate(),
      ownerId: input.ownerId,
      title: Habit.normalizeTitle(input.title),
      description: Habit.normalizeDescription(input.description),
      type: input.type,
      frequency,
      quitStartedAt,
      isActive: true,
      revision: 1,
      createdAt: now,
      createdOn: input.today,
      latestLifecycleEffectiveOn: null,
      updatedAt: now,
    });
  }

  public static rehydrate(props: HabitProps): Habit {
    return new Habit(props);
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

  public get description(): string | null {
    return this.props.description;
  }

  public get type(): HabitType {
    return this.props.type;
  }

  public get frequency(): HabitFrequency | null {
    return this.props.frequency;
  }

  public get quitStartedAt(): Date | null {
    return this.props.quitStartedAt;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get revision(): number {
    return this.props.revision;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get createdOn(): HabitCalendarDate {
    return this.props.createdOn;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public update(input: {
    title: string;
    description?: string | null;
    frequency?: HabitFrequency | null;
    quitStartedAt?: Date | null;
  }): void {
    this.ensureActive();

    const nextTitle = Habit.normalizeTitle(input.title);
    const nextDescription = Habit.normalizeDescription(input.description);
    const { frequency: nextFrequency, quitStartedAt: nextQuitStartedAt } =
      this.resolveFieldsForUpdate(
        input.frequency ?? null,
        input.quitStartedAt ?? null,
      );

    const changed =
      this.props.title !== nextTitle ||
      this.props.description !== nextDescription ||
      !Habit.frequenciesEqual(this.props.frequency, nextFrequency) ||
      !Habit.datesEqual(this.props.quitStartedAt, nextQuitStartedAt);

    if (!changed) {
      return;
    }

    this.props.title = nextTitle;
    this.props.description = nextDescription;
    this.props.frequency = nextFrequency;
    this.props.quitStartedAt = nextQuitStartedAt;
    this.trackChange();
  }

  public archive(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (!this.props.isActive) {
      throw new InvalidHabitTransitionException(false);
    }

    this.props.isActive = false;
    this.trackChange();
    this.recordLifecycleTransition(HabitLifecycleAction.ARCHIVED, today);
  }

  public restore(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (this.props.isActive) {
      throw new InvalidHabitTransitionException(true);
    }

    this.props.isActive = true;
    this.trackChange();
    this.recordLifecycleTransition(HabitLifecycleAction.RESTORED, today);
  }

  public isDueOn(isoWeekday: number): boolean {
    return (
      this.props.isActive &&
      this.props.frequency !== null &&
      this.props.frequency.isDueOn(isoWeekday)
    );
  }

  public toPrimitives(): HabitPrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      title: this.props.title,
      description: this.props.description,
      type: this.props.type,
      frequencyType: this.props.frequency?.type ?? null,
      frequencyDays: this.props.frequency?.days ?? [],
      quitStartedAt: this.props.quitStartedAt,
      isActive: this.props.isActive,
      revision: this.props.revision,
      createdAt: this.props.createdAt,
      createdOn: this.props.createdOn.value,
      updatedAt: this.props.updatedAt,
    };
  }

  private ensureActive(): void {
    if (!this.props.isActive) {
      throw new InvalidHabitTransitionException(false);
    }
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
        'Habit lifecycle floor was not loaded; load the Habit through HabitRepository before archive/restore',
      );
    }
  }

  // Mốc hiệu lực không bao giờ giảm (DAP-FTH-001): nếu "hôm nay" theo múi
  // giờ hiện tại sớm hơn mốc đã ghi, transition được kẹp về mốc đó. Chuỗi
  // lifecycle bắt đầu từ createdOn nên createdOn cũng là mốc sàn.
  private recordLifecycleTransition(
    action: HabitLifecycleAction,
    today: HabitCalendarDate,
  ): void {
    const floor = HabitCalendarDate.latest(
      this.props.createdOn,
      this.props.latestLifecycleEffectiveOn ?? null,
    );
    const effectiveOn = HabitCalendarDate.latest(today, floor);

    this.props.latestLifecycleEffectiveOn = effectiveOn;
    this.addDomainEvent(
      new HabitLifecycleTransitionedEvent(
        this.props.id.value,
        this.props.ownerId,
        action,
        effectiveOn,
      ),
    );
  }

  private resolveFieldsForUpdate(
    frequency: HabitFrequency | null,
    quitStartedAt: Date | null,
  ): TypeScopedFields {
    if (this.props.type === HabitType.BUILD) {
      if (!frequency || quitStartedAt) {
        throw new InvalidHabitTypeException();
      }

      return { frequency, quitStartedAt: null };
    }

    if (frequency || !quitStartedAt) {
      throw new InvalidHabitTypeException();
    }

    const normalizedQuitStartedAt = Habit.startOfUtcDay(quitStartedAt);
    Habit.ensureNotFutureDate(normalizedQuitStartedAt);

    return { frequency: null, quitStartedAt: normalizedQuitStartedAt };
  }

  private static resolveFieldsForCreate(
    type: HabitType,
    frequency: HabitFrequency | null,
    quitStartedAt: Date | null,
    now: Date,
  ): TypeScopedFields {
    if (type === HabitType.BUILD) {
      if (!frequency || quitStartedAt) {
        throw new InvalidHabitTypeException();
      }

      return { frequency, quitStartedAt: null };
    }

    if (type !== HabitType.QUIT) {
      throw new InvalidHabitTypeException();
    }

    if (frequency) {
      throw new InvalidHabitTypeException();
    }

    const resolvedQuitStartedAt = Habit.startOfUtcDay(quitStartedAt ?? now);
    Habit.ensureNotFutureDate(resolvedQuitStartedAt);

    return { frequency: null, quitStartedAt: resolvedQuitStartedAt };
  }

  private static ensureNotFutureDate(date: Date): void {
    if (
      Habit.startOfUtcDay(date).getTime() >
      Habit.startOfUtcDay(new Date()).getTime()
    ) {
      throw new InvalidQuitStartedAtException();
    }
  }

  private static startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private static frequenciesEqual(
    a: HabitFrequency | null,
    b: HabitFrequency | null,
  ): boolean {
    if (a === null || b === null) {
      return a === b;
    }

    return a.equals(b);
  }

  private static datesEqual(a: Date | null, b: Date | null): boolean {
    if (a === null || b === null) {
      return a === b;
    }

    return a.getTime() === b.getTime();
  }

  private static normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || [...normalizedTitle].length > MAX_TITLE_LENGTH) {
      throw new InvalidHabitTitleException();
    }

    return normalizedTitle;
  }

  private static normalizeDescription(
    description?: string | null,
  ): string | null {
    return description?.trim() || null;
  }
}
