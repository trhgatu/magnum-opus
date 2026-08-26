import { Module } from '@nestjs/common';

import { HabitModule } from './habit/habit.module';
import { HabitCheckInModule } from './habit-check-in/habit-check-in.module';
import { RoutineModule } from './routine/routine.module';

@Module({
  imports: [HabitModule, HabitCheckInModule, RoutineModule],
})
export class ForgeModule {}
