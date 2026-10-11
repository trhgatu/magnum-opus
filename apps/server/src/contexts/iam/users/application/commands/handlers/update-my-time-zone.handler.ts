import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { TimeZone } from '@iam/users/domain/value-objects';
import { InvalidTimeZoneException } from '@iam/users/domain/exceptions/invalid-time-zone.exception';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';

import { UpdateMyTimeZoneCommand } from '../update-my-time-zone.command';

@CommandHandler(UpdateMyTimeZoneCommand)
export class UpdateMyTimeZoneHandler implements ICommandHandler<
  UpdateMyTimeZoneCommand,
  Result<string, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute({
    userId,
    timeZone,
  }: UpdateMyTimeZoneCommand): Promise<Result<string, DomainException>> {
    if (!TimeZone.isValid(timeZone)) {
      return Result.fail(new InvalidTimeZoneException(timeZone));
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Result.fail(new UserNotFoundException(userId));
    }

    // Người tự đổi múi giờ của mình nên cũng là updatedBy. Ghi qua
    // changeTimeZone (một cột) chứ không save() cả snapshot.
    if (user.changeTimeZone(timeZone, userId)) {
      const saved = await this.userRepository.changeTimeZone(
        userId,
        user.timeZone,
        userId,
      );
      if (!saved) {
        return Result.fail(new UserNotFoundException(userId));
      }
    }

    return Result.ok(user.timeZone);
  }
}
