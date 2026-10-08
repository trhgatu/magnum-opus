import { Injectable } from '@nestjs/common';

import { MemoryState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ChronicleSectionReader } from '../../application/ports';
import { MemorySectionData } from '../../application/section-data';
import { ChroniclePeriod } from '../../domain/value-objects';

@Injectable()
export class PrismaMemoryChronicleReader implements ChronicleSectionReader<'memory'> {
  public readonly module = 'memory' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = false;

  constructor(private readonly prisma: PrismaService) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<MemorySectionData> {
    const memoryCount = await this.prisma.memory.count({
      where: {
        ownerId,
        state: MemoryState.ACTIVE,
        createdAt: { gte: period.start, lt: period.end },
      },
    });

    return { memoryCount };
  }
}
