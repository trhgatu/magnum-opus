import { AggregateRoot } from '@shared/domain/aggregate-root';

import {
  InvalidRoutineHabitIdException,
  InvalidRoutineTitleException,
  InvalidRoutineTransitionException,
  RoutineHabitAlreadyExistsException,
  RoutineHabitNotFoundException,
} from './exceptions';

import { RoutineId } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface RoutineProps {
  id: RoutineId;
  ownerId: string;
  title: string;
  habitIds: string[];
  isActive: boolean;
  revision: number;
  createdAt: Date;
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
  updatedAt: Date;
}

export class Routine extends AggregateRoot {
  private constructor(private readonly props: RoutineProps) {
    super();
  }

  public static create(input: { ownerId: string; title: string }): Routine {
    const now = new Date();

    return new Routine({
      id: RoutineId.generate(),
      ownerId: input.ownerId,
      title: Routine.normalizeTitle(input.title),
      habitIds: [],
      isActive: true,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: RoutineProps): Routine {
    return new Routine({
      ...props,
      habitIds: [...props.habitIds],
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

  public restore(): void {
    if (this.props.isActive) {
      throw new InvalidRoutineTransitionException(true);
    }

    this.props.isActive = true;
    this.trackChange();
  }

  public archive(): void {
    if (!this.props.isActive) {
      throw new InvalidRoutineTransitionException(false);
    }
    this.props.isActive = false;
    this.trackChange();
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
      updatedAt: this.props.updatedAt,
    };
  }
  public addHabit(habitId: string): void {
    this.ensureActive();

    const normalizedHabitId = Routine.normalizeHabitId(habitId);

    if (this.props.habitIds.includes(normalizedHabitId)) {
      throw new RoutineHabitAlreadyExistsException(normalizedHabitId);
    }

    this.props.habitIds.push(normalizedHabitId);
    this.trackChange();
  }

  public removeHabit(habitId: string): void {
    this.ensureActive();

    const normalizedHabitId = Routine.normalizeHabitId(habitId);
    const habitIndex = this.props.habitIds.indexOf(normalizedHabitId);

    if (habitIndex === -1) {
      throw new RoutineHabitNotFoundException(normalizedHabitId);
    }

    this.props.habitIds.splice(habitIndex, 1);
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
