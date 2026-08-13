import type { NotificationRepository } from '../../domain/ports/notification.repository';
import { CreateNotificationService } from './create-notification.service';

describe('CreateNotificationService', () => {
  const repository = {
    createIfAbsent: jest.fn(),
  } as unknown as jest.Mocked<NotificationRepository>;

  beforeEach(() => jest.clearAllMocks());

  it('persists a new notification with the requested id', async () => {
    repository.createIfAbsent.mockResolvedValue(true);
    const service = new CreateNotificationService(repository);

    await expect(
      service.execute({
        id: 'event-1',
        userId: 'user-1',
        title: 'Welcome',
        content: 'Created from an integration event',
      }),
    ).resolves.toBe('event-1');

    expect(repository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1', userId: 'user-1' }),
    );
  });

  it('treats a duplicate id as an idempotent success', async () => {
    repository.createIfAbsent.mockResolvedValue(false);
    const service = new CreateNotificationService(repository);

    await expect(
      service.execute({
        id: 'event-1',
        userId: 'user-1',
        title: 'Welcome',
        content: 'Duplicate delivery',
      }),
    ).resolves.toBe('event-1');
  });
});
