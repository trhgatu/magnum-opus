import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@repo/database';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    // Let the adapter own the pg pool lifecycle; passing an external Pool is
    // the misconfiguration diagnosed as ECONNREFUSED on Prisma 7.8
    // (docs/development-and-deployment.md §8).
    super({
      adapter: new PrismaPg({ connectionString }),
      // project_cycles.intended_outcome sắp bị drop (V1.1 PR4b): không đọc
      // nữa, kể cả qua include lồng nhau. Migration drop chạy trong lúc bản
      // này còn sống, nên bản này không được SELECT cột đó. Bỏ cùng lúc drop.
      omit: { projectCycle: { intendedOutcome: true } },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
