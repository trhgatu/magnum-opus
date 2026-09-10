import { ICommand } from '@nestjs/cqrs';

import { HabitFrequencyType, HabitType } from '../../domain/enums';

export class CreateHabitCommand implements ICommand {
  public readonly ownerId: string;
  public readonly title: string;
  public readonly description: string | null;
  public readonly type: HabitType;
  public readonly frequencyType: HabitFrequencyType | null;
  public readonly frequencyDays: number[];
  public readonly quitStartedAt: Date | null;

  constructor(props: {
    ownerId: string;
    title: string;
    description?: string | null;
    type: HabitType;
    frequencyType?: HabitFrequencyType | null;
    frequencyDays?: number[];
    quitStartedAt?: Date | null;
  }) {
    this.ownerId = props.ownerId;
    this.title = props.title;
    this.description = props.description ?? null;
    this.type = props.type;
    this.frequencyType = props.frequencyType ?? null;
    this.frequencyDays = [...(props.frequencyDays ?? [])];
    this.quitStartedAt = props.quitStartedAt ?? null;
  }
}
