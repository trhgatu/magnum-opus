import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

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

  async insert(connection: GitHubConnection): Promise<boolean> {
    try {
      await this.prisma.integrationConnection.create({
        data: {
          id: connection.id,
          ownerId: connection.ownerId,
          provider: GITHUB_PROVIDER,
          createdAt: connection.createdAt,
          ...PrismaGitHubConnectionMapper.toMutableData(connection),
        },
      });
      return true;
    } catch (error) {
      // Unique (owner_id, provider): một request khác đã tạo kết nối trước.
      if (isUniqueConflict(error)) return false;
      throw error;
    }
  }

  async update(connection: GitHubConnection): Promise<boolean> {
    // updateMany thay cho update: dòng đã bị xóa thì trả count 0 thay vì
    // ném P2025.
    const result = await this.prisma.integrationConnection.updateMany({
      where: { ownerId: connection.ownerId, provider: GITHUB_PROVIDER },
      data: PrismaGitHubConnectionMapper.toMutableData(connection),
    });
    return result.count === 1;
  }

  async deleteByOwner(ownerId: string): Promise<void> {
    await this.prisma.integrationConnection.deleteMany({
      where: { ownerId, provider: GITHUB_PROVIDER },
    });
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
