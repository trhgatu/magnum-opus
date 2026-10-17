import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  GitHubRepositoryUsageReader,
  ProjectRef,
} from '../../application/ports/github-repository-usage-reader.port';

@Injectable()
export class PrismaGitHubRepositoryUsageReader implements GitHubRepositoryUsageReader {
  constructor(private readonly prisma: PrismaService) {}

  async usedByProjects(
    ownerId: string,
    repositoryIds: readonly string[],
  ): Promise<Record<string, ProjectRef[]>> {
    if (repositoryIds.length === 0) return {};

    const links = await this.prisma.projectActivitySource.findMany({
      where: {
        ownerId,
        feed: {
          provider: 'GITHUB',
          externalResourceId: { in: [...repositoryIds] },
        },
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
      // Cùng repository dưới hai tài khoản trên một Project: liệt kê một lần.
      if (!projects.some((project) => project.id === link.project.id)) {
        projects.push({ id: link.project.id, title: link.project.title });
      }
    }
    return usage;
  }
}
