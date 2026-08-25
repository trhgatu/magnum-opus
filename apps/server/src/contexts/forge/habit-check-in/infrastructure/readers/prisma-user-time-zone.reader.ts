import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { UserTimeZoneReader } from '../../application/ports/user-time-zone-reader.port';

@Injectable()
export class PrismaUserTimeZoneReader implements UserTimeZoneReader {
  constructor(private readonly prisma: PrismaService) {}

  public async getForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timeZone: true },
    });

    return user.timeZone;
  }
}
