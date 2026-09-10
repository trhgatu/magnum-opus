import { AggregateRoot } from '@shared/domain/aggregate-root';

import { HabitRelapseId } from './value-objects';

export interface HabitRelapseProps {
  id: HabitRelapseId;
  habitId: string;
  ownerId: string;
  occurredAt: Date;
  createdAt: Date;
}

export interface HabitRelapsePrimitives {
  id: string;
  habitId: string;
  ownerId: string;
  occurredAt: Date;
  createdAt: Date;
}

export class HabitRelapse extends AggregateRoot {
  private constructor(private readonly props: HabitRelapseProps) {
    super();
  }

  public static create(input: {
    habitId: string;
    ownerId: string;
    occurredAt: Date;
    createdAt: Date;
  }): HabitRelapse {
    return new HabitRelapse({ id: HabitRelapseId.generate(), ...input });
  }

  public static rehydrate(props: HabitRelapseProps): HabitRelapse {
    return new HabitRelapse(props);
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

  public get occurredAt(): Date {
    return this.props.occurredAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public toPrimitives(): HabitRelapsePrimitives {
    return {
      id: this.id,
      habitId: this.habitId,
      ownerId: this.ownerId,
      occurredAt: this.occurredAt,
      createdAt: this.createdAt,
    };
  }
}
