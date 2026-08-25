import { ICommand } from '@nestjs/cqrs';

import { HabitFrequencyType } from '../../domain/enums';

export class CreateHabitCommand implements ICommand {
  public readonly ownerId: string;
  public readonly title: string;
  public readonly description: string | null;
  public readonly frequencyType: HabitFrequencyType;
  public readonly frequencyDays: number[];

  constructor(props: {
    ownerId: string;
    title: string;
    description?: string | null;
    frequencyType: HabitFrequencyType;
    frequencyDays?: number[];
  }) {
    this.ownerId = props.ownerId;
    this.title = props.title;
    this.description = props.description ?? null;
    this.frequencyType = props.frequencyType;
    this.frequencyDays = [...(props.frequencyDays ?? [])];
  }
}
