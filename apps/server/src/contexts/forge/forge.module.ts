import { Module } from '@nestjs/common';

import { HabitModule } from './habit/habit.module';
import { HabitCheckInModule } from './habit-check-in/habit-check-in.module';

@Module({
  imports: [HabitModule, HabitCheckInModule],
})
export class ForgeModule {}
