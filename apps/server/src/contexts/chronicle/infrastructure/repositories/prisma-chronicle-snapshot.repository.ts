import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  ChronicleSectionToStore,
  ChronicleSnapshotRepository,
  StoredChronicleSection,
  StoredChronicleSnapshot,
} from '../../application/ports/chronicle-snapshot.repository.port';
import { ChroniclePeriod } from '../../domain/value-objects';

const sectionSelect = {
  module: true,
  schemaVersion: true,
  data: true,
} as const;

@Injectable()
export class PrismaChronicleSnapshotRepository implements ChronicleSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findForPeriod(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<StoredChronicleSnapshot | null> {
    return this.prisma.chronicleSnapshot.findUnique({
      where: {
        ownerId_periodType_periodKey: {
          ownerId,
          periodType: period.type,
          periodKey: period.key,
        },
      },
      select: {
        id: true,
        computedAt: true,
        sections: { select: sectionSelect },
      },
    });
  }

  public async createOrGet(
    ownerId: string,
    period: ChroniclePeriod,
    computedAt: Date,
    sections: ChronicleSectionToStore[],
  ): Promise<StoredChronicleSnapshot> {
    try {
      // Nested create chạy trong 1 transaction: snapshot và mọi section
      // cùng được ghi, hoặc không gì được ghi.
      return await this.prisma.chronicleSnapshot.create({
        data: {
          ownerId,
          periodType: period.type,
          periodKey: period.key,
          periodStart: period.start,
          periodEnd: period.end,
          computedAt,
          sections: {
            create: sections.map((section) =>
              toSectionData(section, computedAt),
            ),
          },
        },
        select: {
          id: true,
          computedAt: true,
          sections: { select: sectionSelect },
        },
      });
    } catch (error: unknown) {
      if (!isUniqueConflict(error)) {
        throw error;
      }

      // Request khác vừa tạo snapshot cho cùng kỳ — dùng bản của nó.
      const existing = await this.findForPeriod(ownerId, period);

      if (!existing) {
        throw error;
      }

      return existing;
    }
  }

  public async addSectionOrGet(
    snapshotId: string,
    section: ChronicleSectionToStore,
    computedAt: Date,
  ): Promise<StoredChronicleSection> {
    try {
      return await this.prisma.chronicleSnapshotSection.create({
        data: { snapshotId, ...toSectionData(section, computedAt) },
        select: sectionSelect,
      });
    } catch (error: unknown) {
      if (!isUniqueConflict(error)) {
        throw error;
      }

      return this.prisma.chronicleSnapshotSection.findUniqueOrThrow({
        where: {
          snapshotId_module: { snapshotId, module: section.module },
        },
        select: sectionSelect,
      });
    }
  }

  public async replaceSection(
    snapshotId: string,
    section: ChronicleSectionToStore,
    computedAt: Date,
  ): Promise<StoredChronicleSection> {
    return this.prisma.chronicleSnapshotSection.update({
      where: { snapshotId_module: { snapshotId, module: section.module } },
      data: {
        schemaVersion: section.schemaVersion,
        computedAt,
        data: section.data as Prisma.InputJsonValue,
      },
      select: sectionSelect,
    });
  }
}

const toSectionData = (section: ChronicleSectionToStore, computedAt: Date) => ({
  module: section.module,
  schemaVersion: section.schemaVersion,
  computedAt,
  data: section.data as Prisma.InputJsonValue,
});

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
