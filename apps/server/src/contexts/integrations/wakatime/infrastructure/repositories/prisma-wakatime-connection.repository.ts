import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type { WakaTimeConnectionRepository } from '../../domain/ports/wakatime-connection.repository';
import type { WakaTimeConnection } from '../../domain/wakatime-connection.entity';
import {
  PrismaWakaTimeConnectionMapper,
  WAKATIME_PROVIDER,
} from '../mappers/prisma-wakatime-connection.mapper';

@Injectable()
export class PrismaWakaTimeConnectionRepository implements WakaTimeConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(ownerId: string): Promise<WakaTimeConnection | null> {
    const raw = await this.prisma.integrationConnection.findUnique({
      where: { ownerId_provider: { ownerId, provider: WAKATIME_PROVIDER } },
    });
    return raw ? PrismaWakaTimeConnectionMapper.toDomain(raw) : null;
  }

  async insert(connection: WakaTimeConnection): Promise<boolean> {
    try {
      await this.prisma.integrationConnection.create({
        data: {
          id: connection.id,
          ownerId: connection.ownerId,
          provider: WAKATIME_PROVIDER,
          createdAt: connection.createdAt,
          ...PrismaWakaTimeConnectionMapper.toMutableData(connection),
        },
      });
      return true;
    } catch (error) {
      // Unique (owner_id, provider): một request khác đã tạo kết nối trước.
      if (isUniqueConflict(error)) return false;
      throw error;
    }
  }

  async update(
    connection: WakaTimeConnection,
    expectedEncryptedKey: string,
  ): Promise<boolean> {
    // updateMany thay cho update: dòng đã bị xóa hoặc đã đổi key thì trả
    // count 0 thay vì ném P2025 hay ghi đè. Mỗi lần mã hóa có IV ngẫu nhiên,
    // nên bản mã khác nhau ở mọi lần kết nối — dùng được như phiên bản.
    const result = await this.prisma.integrationConnection.updateMany({
      where: {
        ownerId: connection.ownerId,
        provider: WAKATIME_PROVIDER,
        credentials: expectedEncryptedKey,
      },
      data: PrismaWakaTimeConnectionMapper.toMutableData(connection),
    });
    return result.count === 1;
  }

  async revokeIfKeyUnchanged(
    ownerId: string,
    encryptedKey: string,
  ): Promise<void> {
    await this.prisma.integrationConnection.updateMany({
      where: {
        ownerId,
        provider: WAKATIME_PROVIDER,
        credentials: encryptedKey,
      },
      data: { status: 'REVOKED' },
    });
  }

  async deleteByOwner(ownerId: string): Promise<void> {
    await this.prisma.integrationConnection.deleteMany({
      where: { ownerId, provider: WAKATIME_PROVIDER },
    });
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
