import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  GardenLedgerWriter,
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
        data: { ...subject, simVersion: CURRENT_SIM_VERSION },
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
}
