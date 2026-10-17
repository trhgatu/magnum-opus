import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type { AccountTimeZoneReader } from '../../application/ports/account-time-zone-reader.port';

@Injectable()
export class PrismaAccountTimeZoneReader implements AccountTimeZoneReader {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timeZone: true },
    });
    return user.timeZone;
  }
}
