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

  async link(link: ProjectActivitySourceLink): Promise<boolean> {
    try {
      await this.prisma.projectActivitySource.create({ data: link });
      return true;
    } catch (error) {
      // Khóa chính (project, feed): đã gắn — một request khác hoặc retry.
      if (isUniqueConflict(error)) return false;
      throw error;
    }
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
