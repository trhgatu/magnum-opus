import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type { GitHubConnection } from '../../domain/github-connection.entity';
import type { GitHubConnectionRepository } from '../../domain/ports/github-connection.repository';
import {
  GITHUB_PROVIDER,
  PrismaGitHubConnectionMapper,
} from '../mappers/prisma-github-connection.mapper';

@Injectable()
export class PrismaGitHubConnectionRepository implements GitHubConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(ownerId: string): Promise<GitHubConnection | null> {
    const raw = await this.prisma.integrationConnection.findUnique({
      where: { ownerId_provider: { ownerId, provider: GITHUB_PROVIDER } },
    });
    return raw ? PrismaGitHubConnectionMapper.toDomain(raw) : null;
  }

  async save(connection: GitHubConnection): Promise<void> {
    const data = PrismaGitHubConnectionMapper.toMutableData(connection);

    await this.prisma.integrationConnection.upsert({
      where: {
        ownerId_provider: {
          ownerId: connection.ownerId,
          provider: GITHUB_PROVIDER,
        },
      },
      create: {
        id: connection.id,
        ownerId: connection.ownerId,
        provider: GITHUB_PROVIDER,
        createdAt: connection.createdAt,
        ...data,
      },
      update: data,
    });
  }

  async deleteByOwner(ownerId: string): Promise<void> {
    await this.prisma.integrationConnection.deleteMany({
      where: { ownerId, provider: GITHUB_PROVIDER },
    });
  }
}
