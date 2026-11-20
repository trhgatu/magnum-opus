import { AggregateRoot } from '@shared/domain/aggregate-root';

import { HabitCheckInDate, HabitCheckInId } from './value-objects';
import { HabitCheckedInEvent, HabitCheckInUndoneEvent } from './events';

export interface HabitCheckInProps {
  id: HabitCheckInId;
  habitId: string;
  ownerId: string;
  date: HabitCheckInDate;
  createdAt: Date;
}

export interface HabitCheckInPrimitives {
  id: string;
  habitId: string;
  ownerId: string;
  date: string;
  createdAt: Date;
}

export class HabitCheckIn extends AggregateRoot {
  private constructor(private readonly props: HabitCheckInProps) {
    super();
  }

  public static create(input: {
    habitId: string;
    ownerId: string;
    date: HabitCheckInDate;
    createdAt: Date;
  }): HabitCheckIn {
    const checkIn = new HabitCheckIn({
      id: HabitCheckInId.generate(),
      ...input,
    });
    checkIn.addDomainEvent(
      new HabitCheckedInEvent(checkIn.habitId, checkIn.ownerId, checkIn.date),
    );
    return checkIn;
  }

  public undo(): void {
    this.addDomainEvent(
      new HabitCheckInUndoneEvent(this.habitId, this.ownerId, this.date),
    );
  }

  public static rehydrate(props: HabitCheckInProps): HabitCheckIn {
    return new HabitCheckIn(props);
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get habitId(): string {
    return this.props.habitId;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get date(): HabitCheckInDate {
    return this.props.date;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public toPrimitives(): HabitCheckInPrimitives {
    return {
      id: this.id,
      habitId: this.habitId,
      ownerId: this.ownerId,
      date: this.date.value,
      createdAt: this.createdAt,
    };
  }
}
