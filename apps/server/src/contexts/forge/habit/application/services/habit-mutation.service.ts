import { Inject, Injectable } from '@nestjs/common';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HabitNotFoundException,
  HabitRevisionConflictException,
} from '../../domain/exceptions';
import { Habit } from '../../domain/habit.aggregate';
import {
  HABIT_REPOSITORY,
  type HabitRepository,
} from '../../domain/ports/habit.repository';

export interface HabitMutationInput {
  habitId: string;
  ownerId: string;
  expectedRevision: number;
  // Chỉ chạy sau khi Habit đã được tìm thấy và đúng revision, nên phần cần
  // await bên trong (vd tính "hôm nay" của owner) không chạy cho Habit không
  // tồn tại.
  mutate: (habit: Habit) => void | Promise<void>;
}

@Injectable()
export class HabitMutationService {
  constructor(
    @Inject(HABIT_REPOSITORY)
    private readonly habitRepository: HabitRepository,
  ) {}

  public async mutate(
    input: HabitMutationInput,
  ): Promise<Result<Habit, DomainException>> {
    const habit = await this.habitRepository.findByIdForOwner(
      input.habitId,
      input.ownerId,
    );

    if (!habit) {
      return Result.fail(new HabitNotFoundException(input.habitId));
    }

    if (habit.revision !== input.expectedRevision) {
      return Result.fail(
        new HabitRevisionConflictException(
          input.habitId,
          input.expectedRevision,
        ),
      );
    }

    try {
      await input.mutate(habit);
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }

    if (habit.revision === input.expectedRevision) {
      return Result.ok(habit);
    }

    const updated = await this.habitRepository.update(
      habit,
      input.expectedRevision,
    );

    return updated
      ? Result.ok(habit)
      : Result.fail(
          new HabitRevisionConflictException(
            input.habitId,
            input.expectedRevision,
          ),
        );
  }
}
