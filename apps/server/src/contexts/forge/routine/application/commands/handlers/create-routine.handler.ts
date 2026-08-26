import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Routine } from '../../../domain/routine.aggregate';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../../../domain/ports/routine.repository';
import { CreateRoutineCommand } from '../create-routine.command';

@CommandHandler(CreateRoutineCommand)
export class CreateRoutineHandler implements ICommandHandler<
  CreateRoutineCommand,
  Result<Routine, DomainException>
> {
  constructor(
    @Inject(ROUTINE_REPOSITORY)
    private readonly routineRepository: RoutineRepository,
  ) {}

  public async execute(
    command: CreateRoutineCommand,
  ): Promise<Result<Routine, DomainException>> {
    const routine = Routine.create({
      ownerId: command.ownerId,
      title: command.title,
    });

    await this.routineRepository.create(routine);

    return Result.ok(routine);
  }
}
