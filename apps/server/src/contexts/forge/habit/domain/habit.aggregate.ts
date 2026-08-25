import { AggregateRoot } from '@shared/domain/aggregate-root';

import { HabitFrequencyType } from './enums';
import {
  InvalidHabitTitleException,
  InvalidHabitTransitionException,
} from './exceptions';
import { HabitFrequency, HabitId } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface HabitProps {
  id: HabitId;
  ownerId: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  isActive: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitPrimitives {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  frequencyType: HabitFrequencyType;
  frequencyDays: number[];
  isActive: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Habit extends AggregateRoot {
  private constructor(private readonly props: HabitProps) {
    super();
  }

  public static create(input: {
    ownerId: string;
    title: string;
    description?: string | null;
    frequency: HabitFrequency;
  }): Habit {
    const now = new Date();

    return new Habit({
      id: HabitId.generate(),
      ownerId: input.ownerId,
      title: Habit.normalizeTitle(input.title),
      description: Habit.normalizeDescription(input.description),
      frequency: input.frequency,
      isActive: true,
      revision: 1,
      createdAt: now,
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

  public get frequency(): HabitFrequency {
    return this.props.frequency;
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

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public update(input: {
    title: string;
    description?: string | null;
    frequency: HabitFrequency;
  }): void {
    this.ensureActive();

    const nextTitle = Habit.normalizeTitle(input.title);
    const nextDescription = Habit.normalizeDescription(input.description);
    const changed =
      this.props.title !== nextTitle ||
      this.props.description !== nextDescription ||
      !this.props.frequency.equals(input.frequency);

    if (!changed) {
      return;
    }

    this.props.title = nextTitle;
    this.props.description = nextDescription;
    this.props.frequency = input.frequency;
    this.trackChange();
  }

  public archive(): void {
    if (!this.props.isActive) {
      throw new InvalidHabitTransitionException(false);
    }

    this.props.isActive = false;
    this.trackChange();
  }

  public restore(): void {
    if (this.props.isActive) {
      throw new InvalidHabitTransitionException(true);
    }

    this.props.isActive = true;
    this.trackChange();
  }

  public isDueOn(isoWeekday: number): boolean {
    return this.props.isActive && this.props.frequency.isDueOn(isoWeekday);
  }

  public toPrimitives(): HabitPrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      title: this.props.title,
      description: this.props.description,
      frequencyType: this.props.frequency.type,
      frequencyDays: this.props.frequency.days,
      isActive: this.props.isActive,
      revision: this.props.revision,
      createdAt: this.props.createdAt,
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
