import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  GardenLedgerWriter,
  LedgerEntry,
  PlantedSubject,
} from '../../application/ports/garden-ledger-writer.port';
import {
  CURRENT_SIM_VERSION,
  type GardenSubjectKind,
} from '../../domain/garden-subject';

@Injectable()
export class PrismaGardenLedgerWriter implements GardenLedgerWriter {
  constructor(private readonly prisma: PrismaService) {}

  async plant(subject: PlantedSubject): Promise<void> {
    try {
      await this.prisma.gardenSubject.create({
        data: {
          ...subject,
          name: subject.nameAtPlanting,
          simVersion: CURRENT_SIM_VERSION,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  async uproot(
    subjectKind: GardenSubjectKind,
    subjectId: string,
  ): Promise<void> {
    await this.prisma.gardenSubject.deleteMany({
      where: { subjectKind, subjectId },
    });
  }

  async record(entry: LedgerEntry): Promise<void> {
    const subject = await this.prisma.gardenSubject.findUnique({
      where: {
        subjectKind_subjectId: {
          subjectKind: entry.subjectKind,
          subjectId: entry.subjectId,
        },
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!subject) return;

    try {
      await this.prisma.gardenEntry.create({
        data: {
          ownerId: subject.ownerId,
          subjectId: subject.id,
          kind: entry.kind,
          mark: entry.mark,
          detail: entry.detail,
          occurredOn: entry.occurredOn,
          sourceEventId: entry.sourceEventId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code == 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  async replant(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    plantedOn: Date,
  ): Promise<void> {
    await this.prisma.gardenSubject.updateMany({
      where: {
        subjectKind,
        subjectId,
      },
      data: { plantedOn },
    });
  }

  async hide(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    hiddenAt: Date,
  ): Promise<void> {
    await this.prisma.gardenSubject.updateMany({
      where: { subjectKind, subjectId },
      data: { hiddenAt },
    });
  }

  async show(subjectKind: GardenSubjectKind, subjectId: string): Promise<void> {
    await this.prisma.gardenSubject.updateMany({
      where: { subjectKind, subjectId },
      data: { hiddenAt: null },
    });
  }

  async rename(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    name: string,
  ): Promise<void> {
    await this.prisma.gardenSubject.updateMany({
      where: { subjectKind, subjectId },
      data: { name },
    });
  }

  async assignBed(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    bed: { id: string; name: string },
  ): Promise<void> {
    await this.prisma.gardenSubject.updateMany({
      where: { subjectKind, subjectId, bedId: null },
      data: { bedId: bed.id, bedName: bed.name },
    });
  }
}
