import { AggregateRoot } from '@shared/domain/aggregate-root';

import { HabitCheckInDate, HabitCheckInId } from './value-objects';

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
    return new HabitCheckIn({ id: HabitCheckInId.generate(), ...input });
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
