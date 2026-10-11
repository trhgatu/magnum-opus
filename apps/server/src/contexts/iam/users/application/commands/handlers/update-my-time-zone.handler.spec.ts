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
      changeTimeZone: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
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
    expect(user.updatedBy).toBe('user-id');
    expect(repository.changeTimeZone).toHaveBeenCalledWith(
      'user-id',
      'Asia/Ho_Chi_Minh',
      'user-id',
    );
    // Never the whole snapshot: save() would also rewrite profile and roles.
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('skips the write when the time zone is unchanged', async () => {
    const repository = createRepository(createUser());
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({ userId: 'user-id', timeZone: 'UTC' }),
    );

    expect(result.getValue()).toBe('UTC');
    expect(repository.changeTimeZone).not.toHaveBeenCalled();
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
    expect(repository.changeTimeZone).not.toHaveBeenCalled();
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

  it('fails when the user is deleted between loading and writing', async () => {
    const repository = createRepository(createUser());
    repository.changeTimeZone.mockResolvedValue(false);
    const handler = new UpdateMyTimeZoneHandler(repository);

    const result = await handler.execute(
      new UpdateMyTimeZoneCommand({
        userId: 'user-id',
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
    );

    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
  });
});
