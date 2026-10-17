import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  ProjectActivitySourceLink,
  ProjectActivitySourceRepository,
} from '../../domain/ports/project-activity-source.repository';

@Injectable()
export class PrismaProjectActivitySourceRepository implements ProjectActivitySourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByProject(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectActivitySourceLink[]> {
    return this.prisma.projectActivitySource.findMany({
      where: { projectId, ownerId },
      orderBy: { linkedAt: 'asc' },
    });
  }

  async findOne(
    ownerId: string,
    projectId: string,
    feedId: string,
  ): Promise<ProjectActivitySourceLink | null> {
    return this.prisma.projectActivitySource.findFirst({
      where: { projectId, feedId, ownerId },
    });
  }

  async link(
    link: ProjectActivitySourceLink,
  ): Promise<{ link: ProjectActivitySourceLink; created: boolean }> {
    // Lần hai: mối nối vừa thấy bị gỡ ngay sau đó — thử tạo lại.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const stored = await this.prisma.projectActivitySource.create({
          data: link,
        });
        return { link: stored, created: true };
      } catch (error) {
        // Khóa chính (project, feed): đã gắn — một request khác hoặc retry.
        if (!isUniqueConflict(error)) throw error;
      }
      const existing = await this.findOne(
        link.ownerId,
        link.projectId,
        link.feedId,
      );
      if (existing) return { link: existing, created: false };
    }
    throw new Error('Activity source link kept changing concurrently');
  }

  async unlink(
    ownerId: string,
    projectId: string,
    feedId: string,
  ): Promise<boolean> {
    const result = await this.prisma.projectActivitySource.deleteMany({
      where: { projectId, feedId, ownerId },
    });
    return result.count > 0;
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
