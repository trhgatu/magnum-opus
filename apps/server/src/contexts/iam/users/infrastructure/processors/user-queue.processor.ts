import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import {
  USER_QUEUE,
  isUserJobName,
  type UserEmailJobData,
  type UserEmailJobResult,
  type UserJobName,
} from '../../application/jobs/user-email.jobs';
import { UserEmailJobService } from '../../application/services/user-email-job.service';

@Processor(USER_QUEUE)
export class UserQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(UserQueueProcessor.name);

  constructor(private readonly jobs: UserEmailJobService) {
    super();
  }

  public async process(
    job: Job<unknown, UserEmailJobResult, string>,
  ): Promise<UserEmailJobResult> {
    if (!isUserJobName(job.name)) {
      throw new Error(`Job name ${job.name} not supported`);
    }
    const data = parseJobData(job.data);
    this.logger.log({
      message: `Processing job ${job.id} of type ${job.name}`,
      jobId: job.id,
      jobName: job.name,
      correlationId: data.correlationId,
    });

    return this.jobs.execute(job.name, data);
  }
}

const parseJobData = (value: unknown): UserEmailJobData => {
  if (!value || typeof value !== 'object') {
    throw new Error('User email job data must be an object');
  }
  const data = value as Record<string, unknown>;
  if (typeof data.email !== 'string' || !data.email.trim()) {
    throw new Error('User email job is missing email');
  }

  return {
    email: data.email,
    resetUrl: optionalString(data.resetUrl, 'resetUrl'),
    verificationUrl: optionalString(data.verificationUrl, 'verificationUrl'),
    correlationId: optionalString(data.correlationId, 'correlationId'),
  };
};

const optionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`User email job ${field} must be a string`);
  }
  return value;
};
