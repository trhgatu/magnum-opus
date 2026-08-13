import type { Job } from 'bullmq';

import {
  USER_JOBS,
  type UserEmailJobResult,
} from '../../application/jobs/user-email.jobs';
import type { UserEmailJobService } from '../../application/services/user-email-job.service';
import { UserQueueProcessor } from './user-queue.processor';

describe('UserQueueProcessor', () => {
  it('forwards BullMQ name and data to the application service', async () => {
    const jobs = {
      execute: jest.fn().mockResolvedValue({
        sent: false,
        email: 'member@example.com',
      }),
    } as unknown as jest.Mocked<UserEmailJobService>;
    const processor = new UserQueueProcessor(jobs);
    const job = {
      id: 'job-1',
      name: USER_JOBS.SEND_WELCOME_EMAIL,
      data: {
        email: 'member@example.com',
        correlationId: 'correlation-1',
      },
    } as Job<unknown, UserEmailJobResult, string>;

    await expect(processor.process(job)).resolves.toEqual({
      sent: false,
      email: 'member@example.com',
    });
    expect(jobs.execute).toHaveBeenCalledWith(job.name, job.data);
  });

  it('rejects an unknown BullMQ job before application dispatch', async () => {
    const jobs = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UserEmailJobService>;
    const processor = new UserQueueProcessor(jobs);

    await expect(
      processor.process({
        id: 'job-2',
        name: 'unknown-job',
        data: { email: 'member@example.com' },
      } as Job<unknown, UserEmailJobResult, string>),
    ).rejects.toThrow('Job name unknown-job not supported');
    expect(jobs.execute).not.toHaveBeenCalled();
  });

  it('rejects malformed payload before application dispatch', async () => {
    const jobs = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UserEmailJobService>;
    const processor = new UserQueueProcessor(jobs);

    await expect(
      processor.process({
        id: 'job-3',
        name: USER_JOBS.SEND_WELCOME_EMAIL,
        data: {},
      } as Job<unknown, UserEmailJobResult, string>),
    ).rejects.toThrow('User email job is missing email');
    expect(jobs.execute).not.toHaveBeenCalled();
  });
});
