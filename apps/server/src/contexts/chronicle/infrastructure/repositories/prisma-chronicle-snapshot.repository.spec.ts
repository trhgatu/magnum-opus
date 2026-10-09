import { Prisma } from '@repo/database';

import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaChronicleSnapshotRepository } from './prisma-chronicle-snapshot.repository';

describe('PrismaChronicleSnapshotRepository', () => {
  const snapshotModel = { findUnique: jest.fn(), create: jest.fn() };
  const sectionModel = {
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    chronicleSnapshot: snapshotModel,
    chronicleSnapshotSection: sectionModel,
  };
  const repository = new PrismaChronicleSnapshotRepository(prisma as never);

  const period = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');
  const computedAt = new Date('2026-09-15T03:00:00.000Z');
  const journalSection = {
    module: 'journal' as const,
    schemaVersion: 1,
    data: { entryCount: 12 },
  };
  const stored = {
    id: 'snapshot-id',
    computedAt,
    sections: [
      { module: 'journal', schemaVersion: 1, data: { entryCount: 12 } },
    ],
  };
  const sectionSelect = { module: true, schemaVersion: true, data: true };
  const snapshotSelect = {
    id: true,
    computedAt: true,
    sections: { select: sectionSelect },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findForPeriod', () => {
    it('looks the snapshot up by owner, period type and period key', async () => {
      snapshotModel.findUnique.mockResolvedValue(stored);

      await expect(
        repository.findForPeriod('owner-id', period),
      ).resolves.toEqual(stored);

      expect(snapshotModel.findUnique).toHaveBeenCalledWith({
        where: {
          ownerId_periodType_periodKey: {
            ownerId: 'owner-id',
            periodType: 'MONTH',
            periodKey: '2026-08',
          },
        },
        select: snapshotSelect,
      });
    });
  });

  describe('createOrGet', () => {
    it('creates the snapshot together with every section', async () => {
      snapshotModel.create.mockResolvedValue(stored);

      await expect(
        repository.createOrGet('owner-id', period, computedAt, [
          journalSection,
        ]),
      ).resolves.toEqual(stored);

      expect(snapshotModel.create).toHaveBeenCalledWith({
        data: {
          ownerId: 'owner-id',
          periodType: 'MONTH',
          periodKey: '2026-08',
          periodStart: period.start,
          periodEnd: period.end,
          computedAt,
          sections: {
            create: [{ ...journalSection, computedAt }],
          },
        },
        select: snapshotSelect,
      });
    });

    it('returns the snapshot another request created first', async () => {
      snapshotModel.create.mockRejectedValue(uniqueConstraintError());
      snapshotModel.findUnique.mockResolvedValue(stored);

      await expect(
        repository.createOrGet('owner-id', period, computedAt, [
          journalSection,
        ]),
      ).resolves.toEqual(stored);
    });

    it('rethrows errors that are not a unique conflict', async () => {
      const failure = new Error('connection lost');
      snapshotModel.create.mockRejectedValue(failure);

      await expect(
        repository.createOrGet('owner-id', period, computedAt, []),
      ).rejects.toBe(failure);
      expect(snapshotModel.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('addSectionOrGet', () => {
    it('adds the missing section to the snapshot', async () => {
      sectionModel.create.mockResolvedValue(stored.sections[0]);

      await repository.addSectionOrGet(
        'snapshot-id',
        journalSection,
        computedAt,
      );

      expect(sectionModel.create).toHaveBeenCalledWith({
        data: { snapshotId: 'snapshot-id', ...journalSection, computedAt },
        select: sectionSelect,
      });
    });

    it('returns the section another request added first', async () => {
      sectionModel.create.mockRejectedValue(uniqueConstraintError());
      sectionModel.findUniqueOrThrow.mockResolvedValue(stored.sections[0]);

      await expect(
        repository.addSectionOrGet('snapshot-id', journalSection, computedAt),
      ).resolves.toEqual(stored.sections[0]);

      expect(sectionModel.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          snapshotId_module: { snapshotId: 'snapshot-id', module: 'journal' },
        },
        select: sectionSelect,
      });
    });
  });

  describe('replaceSection', () => {
    it('overwrites data, schema version and computedAt of one section', async () => {
      const upgraded = {
        module: 'project' as const,
        schemaVersion: 2,
        data: {},
      };
      sectionModel.update.mockResolvedValue(upgraded);

      await repository.replaceSection('snapshot-id', upgraded, computedAt);

      expect(sectionModel.update).toHaveBeenCalledWith({
        where: {
          snapshotId_module: { snapshotId: 'snapshot-id', module: 'project' },
        },
        data: { schemaVersion: 2, computedAt, data: {} },
        select: sectionSelect,
      });
    });
  });
});

function uniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
  });
}
