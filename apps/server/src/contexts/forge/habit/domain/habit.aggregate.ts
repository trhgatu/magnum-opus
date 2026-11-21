import { AggregateRoot } from '@shared/domain/aggregate-root';

import {
  HabitFrequencyType,
  HabitLifecycleAction,
  HabitType,
  HabitState,
} from './enums';
import {
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
  HabitPermanentlyDeletedEvent,
  HabitCreatedEvent,
  HabitQuitStartChangedEvent,
  HabitTrashedEvent,
  HabitRestoredFromTrashEvent,
  HabitRenamedEvent,
} from './events';
import {
  HabitPermanentDeleteForbiddenException,
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
  state: HabitState;
  stateBeforeTrash: HabitState | null;
  trashedAt: Date | null;
  revision: number;
  createdAt: Date;
  createdOn: HabitCalendarDate;
  latestLifecycleEffectiveOn: HabitCalendarDate | null | undefined;
  openScheduleEffectiveFrom: HabitCalendarDate | null | undefined;
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
  state: HabitState;
  stateBeforeTrash: HabitState | null;
  trashedAt: Date | null;
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
      input.today,
    );

    const habit = new Habit({
      id: HabitId.generate(),
      ownerId: input.ownerId,
      title: Habit.normalizeTitle(input.title),
      description: Habit.normalizeDescription(input.description),
      type: input.type,
      frequency,
      quitStartedAt,
      state: HabitState.ACTIVE,
      stateBeforeTrash: null,
      trashedAt: null,
      revision: 1,
      createdAt: now,
      createdOn: input.today,
      latestLifecycleEffectiveOn: null,
      openScheduleEffectiveFrom: null,
      updatedAt: now,
    });

    habit.addDomainEvent(
      new HabitCreatedEvent(
        habit.id,
        habit.ownerId,
        habit.type,
        habit.title,
        quitStartedAt
          ? HabitCalendarDate.fromPersistenceDate(quitStartedAt)
          : input.today,
      ),
    );

    if (frequency !== null) {
      habit.recordScheduleVersion(frequency, input.today);
    }

    return habit;
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

  public get state(): HabitState {
    return this.props.state;
  }

  public get stateBeforeTrash(): HabitState | null {
    return this.props.stateBeforeTrash;
  }

  public get trashedAt(): Date | null {
    return this.props.trashedAt;
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
    today?: HabitCalendarDate;
  }): void {
    this.ensureActive();

    const nextTitle = Habit.normalizeTitle(input.title);
    const nextDescription = Habit.normalizeDescription(input.description);
    const { frequency: nextFrequency, quitStartedAt: nextQuitStartedAt } =
      this.resolveFieldsForUpdate(
        input.frequency ?? null,
        input.quitStartedAt ?? null,
        input.today,
      );
    const frequencyChanged = !Habit.frequenciesEqual(
      this.props.frequency,
      nextFrequency,
    );

    const quitStartChanged = !Habit.datesEqual(
      this.props.quitStartedAt,
      nextQuitStartedAt,
    );

    const titleChanged = this.props.title !== nextTitle;

    const changed =
      titleChanged ||
      this.props.description !== nextDescription ||
      frequencyChanged ||
      quitStartChanged;

    if (!changed) {
      return;
    }

    if (frequencyChanged) {
      this.ensureScheduleFloorLoaded();
    }

    if (frequencyChanged && nextFrequency !== null && !input.today) {
      throw new Error(
        'Owner calendar date is required to change a Habit frequency',
      );
    }

    this.props.title = nextTitle;
    this.props.description = nextDescription;
    this.props.frequency = nextFrequency;
    this.props.quitStartedAt = nextQuitStartedAt;
    this.trackChange();

    if (frequencyChanged && nextFrequency !== null && input.today) {
      this.recordScheduleVersion(nextFrequency, input.today);
    }

    if (quitStartChanged && nextQuitStartedAt !== null) {
      this.addDomainEvent(
        new HabitQuitStartChangedEvent(
          this.props.id.value,
          this.props.ownerId,
          HabitCalendarDate.fromPersistenceDate(nextQuitStartedAt),
        ),
      );
    }

    if (titleChanged) {
      this.addDomainEvent(
        new HabitRenamedEvent(
          this.props.id.value,
          this.props.ownerId,
          nextTitle,
        ),
      );
    }
  }

  public changesFrequency(frequency: HabitFrequency | null): boolean {
    return (
      frequency !== null &&
      !Habit.frequenciesEqual(this.props.frequency, frequency)
    );
  }

  public archive(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (this.props.state !== HabitState.ACTIVE) {
      throw new InvalidHabitTransitionException(this.props.state);
    }

    this.props.state = HabitState.ARCHIVED;
    this.trackChange();
    this.recordLifecycleTransition(HabitLifecycleAction.ARCHIVED, today);
  }

  public restore(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (this.props.state !== HabitState.ARCHIVED) {
      throw new InvalidHabitTransitionException(this.props.state);
    }

    this.props.state = HabitState.ACTIVE;
    this.trackChange();
    this.recordLifecycleTransition(HabitLifecycleAction.RESTORED, today);
  }

  public moveToTrash(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    if (this.props.state === HabitState.TRASHED) {
      throw new InvalidHabitTransitionException(this.props.state);
    }

    const wasActive = this.props.state === HabitState.ACTIVE;
    this.props.stateBeforeTrash = this.props.state;
    this.props.state = HabitState.TRASHED;
    this.props.trashedAt = new Date();
    this.trackChange();

    this.addDomainEvent(
      new HabitTrashedEvent(this.props.id.value, this.props.ownerId),
    );

    if (wasActive) {
      this.recordLifecycleTransition(HabitLifecycleAction.ARCHIVED, today);
    }
  }

  public restoreFromTrash(today: HabitCalendarDate): void {
    this.ensureLifecycleFloorLoaded();

    const restoredState = this.props.stateBeforeTrash;

    if (this.props.state !== HabitState.TRASHED || restoredState === null) {
      throw new InvalidHabitTransitionException(this.props.state);
    }

    this.props.state = restoredState;
    this.props.stateBeforeTrash = null;
    this.props.trashedAt = null;
    this.trackChange();

    this.addDomainEvent(
      new HabitRestoredFromTrashEvent(this.props.id.value, this.props.ownerId),
    );

    if (restoredState === HabitState.ACTIVE) {
      this.recordLifecycleTransition(HabitLifecycleAction.RESTORED, today);
    }
  }

  public deletePermanently(): void {
    if (this.props.state !== HabitState.TRASHED) {
      throw new HabitPermanentDeleteForbiddenException(this.props.id.value);
    }

    this.addDomainEvent(
      new HabitPermanentlyDeletedEvent(this.props.id.value, this.props.ownerId),
    );
  }

  public isDueOn(isoWeekday: number): boolean {
    return (
      this.props.state === HabitState.ACTIVE &&
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
      state: this.props.state,
      stateBeforeTrash: this.props.stateBeforeTrash,
      trashedAt: this.props.trashedAt,
      revision: this.props.revision,
      createdAt: this.props.createdAt,
      createdOn: this.props.createdOn.value,
      updatedAt: this.props.updatedAt,
    };
  }

  private ensureActive(): void {
    if (this.props.state !== HabitState.ACTIVE) {
      throw new InvalidHabitTransitionException(this.props.state);
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

  // Lỗi lập trình, giống ensureLifecycleFloorLoaded: đổi tần suất trên
  // aggregate không nạp phiên bản đang mở sẽ bỏ qua quy tắc mốc không giảm.
  private ensureScheduleFloorLoaded(): void {
    if (this.props.openScheduleEffectiveFrom === undefined) {
      throw new Error(
        'Habit schedule floor was not loaded; load the Habit through HabitRepository before changing its frequency',
      );
    }
  }

  private recordScheduleVersion(
    frequency: HabitFrequency,
    today: HabitCalendarDate,
  ): void {
    const floor = HabitCalendarDate.latest(
      this.props.createdOn,
      this.props.openScheduleEffectiveFrom ?? null,
    );
    const effectiveFrom = HabitCalendarDate.latest(today, floor);

    this.props.openScheduleEffectiveFrom = effectiveFrom;
    this.addDomainEvent(
      new HabitScheduleVersionStartedEvent(
        this.props.id.value,
        this.props.ownerId,
        frequency,
        effectiveFrom,
      ),
    );
  }

  private resolveFieldsForUpdate(
    frequency: HabitFrequency | null,
    quitStartedAt: Date | null,
    today: HabitCalendarDate | undefined,
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

    if (!Habit.datesEqual(this.props.quitStartedAt, normalizedQuitStartedAt)) {
      if (!today) {
        throw new Error('Owner calendar date is required to set quitStartedAt');
      }
      Habit.ensureNotFutureDate(normalizedQuitStartedAt, today);
    }
    return { frequency: null, quitStartedAt: normalizedQuitStartedAt };
  }

  private static resolveFieldsForCreate(
    type: HabitType,
    frequency: HabitFrequency | null,
    quitStartedAt: Date | null,
    today: HabitCalendarDate,
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

    const resolvedQuitStartedAt = Habit.startOfUtcDay(
      quitStartedAt ?? today.toPersistenceDate(),
    );
    Habit.ensureNotFutureDate(resolvedQuitStartedAt, today);

    return { frequency: null, quitStartedAt: resolvedQuitStartedAt };
  }

  private static ensureNotFutureDate(
    date: Date,
    today: HabitCalendarDate,
  ): void {
    if (HabitCalendarDate.fromPersistenceDate(date).isAfter(today)) {
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
