import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import { InvalidTimeZoneException } from '@iam/users/domain/exceptions/invalid-time-zone.exception';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';

import { UpdateMyTimeZoneCommand } from '../update-my-time-zone.command';
import { UpdateMyTimeZoneHandler } from './update-my-time-zone.handler';

describe('UpdateMyTimeZoneHandler', () => {
  const createUser = () =>
    UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });

  const createRepository = (user: UserEntity | null) =>
    ({
      findById: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<UserRepository>;

  it('stores the new time zone and returns it', async () => {
    const user = createUser();
    const repository = createRepository(user);
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({
        userId: 'user-id',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe('Asia/Ho_Chi_Minh');
    expect(user.timeZone).toBe('Asia/Ho_Chi_Minh');
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('skips the write when the time zone is unchanged', async () => {
    const repository = createRepository(createUser());
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({ userId: 'user-id', timeZone: 'UTC' }),
    );

    expect(result.getValue()).toBe('UTC');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an invalid time zone before loading the user', async () => {
    const repository = createRepository(createUser());
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({ userId: 'user-id', timeZone: 'Mars/Base' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidTimeZoneException);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('fails when the user no longer exists', async () => {
    const repository = createRepository(null);
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({
        userId: 'missing-id',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
    );

    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
  });
});
