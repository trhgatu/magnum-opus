import { ICommand } from '@nestjs/cqrs';

import { HabitFrequencyType } from '../../domain/enums';

export class UpdateHabitCommand implements ICommand {
  public readonly habitId: string;
  public readonly ownerId: string;
  public readonly expectedRevision: number;
  public readonly title: string;
  public readonly description: string | null;
  public readonly frequencyType: HabitFrequencyType;
  public readonly frequencyDays: number[];

  constructor(props: {
    habitId: string;
    ownerId: string;
    expectedRevision: number;
    title: string;
    description?: string | null;
    frequencyType: HabitFrequencyType;
    frequencyDays?: number[];
  }) {
    this.habitId = props.habitId;
    this.ownerId = props.ownerId;
    this.expectedRevision = props.expectedRevision;
    this.title = props.title;
    this.description = props.description ?? null;
    this.frequencyType = props.frequencyType;
    this.frequencyDays = [...(props.frequencyDays ?? [])];
  }
}
