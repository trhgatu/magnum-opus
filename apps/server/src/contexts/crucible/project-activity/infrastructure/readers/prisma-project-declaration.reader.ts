import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  ProjectDeclaration,
  ProjectDeclarationReader,
} from '../../application/ports/project-declaration-reader.port';

@Injectable()
export class PrismaProjectDeclarationReader implements ProjectDeclarationReader {
  constructor(private readonly prisma: PrismaService) {}

  async read(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectDeclaration | null> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId },
      select: {
        id: true,
        transitions: {
          select: {
            fromState: true,
            toState: true,
            occurredAt: true,
            cycleId: true,
          },
          // Hai lần chuyển cùng thời điểm: thứ tự ghi quyết định.
          orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
        },
        cycles: {
          select: { id: true, cycleNumber: true, startedAt: true },
          orderBy: { cycleNumber: 'asc' },
        },
      },
    });
    if (!project) return null;

    return {
      projectId: project.id,
      transitions: project.transitions,
      cycles: project.cycles,
    };
  }

  async exists(ownerId: string, projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({
      where: { id: projectId, ownerId },
    });
    return count > 0;
  }
}
