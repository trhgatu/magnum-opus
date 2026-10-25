import { Injectable } from '@nestjs/common';
import type { ActivityProvider } from '@repo/contracts';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  ProjectRef,
  ResourceUsageReader,
} from '../../application/ports/resource-usage-reader.port';

@Injectable()
export class PrismaResourceUsageReader implements ResourceUsageReader {
  constructor(private readonly prisma: PrismaService) {}

  async usedByProjects(
    ownerId: string,
    provider: ActivityProvider,
    resourceIds: readonly string[],
  ): Promise<Record<string, ProjectRef[]>> {
    if (resourceIds.length === 0) return {};

    const links = await this.prisma.projectActivitySource.findMany({
      where: {
        ownerId,
        feed: { provider, externalResourceId: { in: [...resourceIds] } },
      },
      select: {
        feed: { select: { externalResourceId: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { linkedAt: 'asc' },
    });

    const usage: Record<string, ProjectRef[]> = {};
    for (const link of links) {
      const projects = (usage[link.feed.externalResourceId] ??= []);
      // Cùng tài nguyên dưới hai tài khoản trên một Project: liệt kê một lần.
      if (!projects.some((project) => project.id === link.project.id)) {
        projects.push({ id: link.project.id, title: link.project.title });
      }
    }
    return usage;
  }
}
