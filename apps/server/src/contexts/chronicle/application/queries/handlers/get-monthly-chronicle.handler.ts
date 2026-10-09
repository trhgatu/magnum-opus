import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { ChronicleMonthInFutureException } from '../../../domain/exceptions';
import { ChroniclePeriod } from '../../../domain/value-objects';

import { type ChronicleSectionReader } from '../../ports/chronicle-section-reader.port';
import {
  CHRONICLE_SNAPSHOT_REPOSITORY,
  type ChronicleSectionToStore,
  type ChronicleSnapshotRepository,
  type StoredChronicleSection,
  type StoredChronicleSnapshot,
} from '../../ports/chronicle-snapshot.repository.port';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../ports/user-time-zone-reader.port';

import { ChronicleSectionDataByModule } from '../../section-data';

import { ChronicleSectionReaderRegistry } from '../../services/chronicle-section-reader-registry';

import {
  GetMonthlyChronicleQuery,
  MonthlyChronicleReadModel,
} from '../get-monthly-chronicle.query';

@QueryHandler(GetMonthlyChronicleQuery)
export class GetMonthlyChronicleHandler implements IQueryHandler<
  GetMonthlyChronicleQuery,
  Result<MonthlyChronicleReadModel, DomainException>
> {
  constructor(
    @Inject(CLOCK)
    private readonly clock: Clock,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CHRONICLE_SNAPSHOT_REPOSITORY)
    private readonly snapshots: ChronicleSnapshotRepository,
    private readonly readers: ChronicleSectionReaderRegistry,
  ) {}

  public async execute(
    query: GetMonthlyChronicleQuery,
  ): Promise<Result<MonthlyChronicleReadModel, DomainException>> {
    const { ownerId, year, month } = query;
    const timeZone = await this.timeZoneReader.getForUser(ownerId);

    let period: ChroniclePeriod;
    try {
      period = ChroniclePeriod.forMonth(year, month, timeZone);
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }

    const now = this.clock.now();

    if (period.isInFuture(now)) {
      return Result.fail(new ChronicleMonthInFutureException(year, month));
    }

    if (period.isCurrent(now)) {
      const computed = await this.computeAll(ownerId, period);

      return Result.ok({
        year,
        month,
        computedAt: now,
        sections: toSectionData(computed),
      });
    }

    const snapshot =
      (await this.snapshots.findForPeriod(ownerId, period)) ??
      (await this.snapshots.createOrGet(
        ownerId,
        period,
        now,
        await this.computeAll(ownerId, period),
      ));

    const sections: ChronicleSectionToStore[] = [];

    for (const reader of this.readers.all()) {
      const stored = snapshot.sections.find(
        (section) => section.module === reader.module,
      );

      sections.push(
        await this.resolveSection(
          reader,
          stored,
          snapshot,
          ownerId,
          period,
          now,
        ),
      );
    }

    return Result.ok({
      year,
      month,
      computedAt: snapshot.computedAt,
      sections: toSectionData(sections),
    });
  }
  private async resolveSection(
    reader: ChronicleSectionReader,
    stored: StoredChronicleSection | undefined,
    snapshot: StoredChronicleSnapshot,
    ownerId: string,
    period: ChroniclePeriod,
    now: Date,
  ): Promise<ChronicleSectionToStore> {
    if (!stored) {
      const added = await this.snapshots.addSectionOrGet(
        snapshot.id,
        await this.compute(reader, ownerId, period),
        now,
      );

      return { ...added, module: reader.module };
    }

    if (stored.schemaVersion === reader.schemaVersion) {
      return { ...stored, module: reader.module };
    }

    if (stored.schemaVersion > reader.schemaVersion) {
      throw new Error(
        `Chronicle section "${reader.module}" is v${stored.schemaVersion}, newer than reader v${reader.schemaVersion}`,
      );
    }

    if (!reader.historyOnly) {
      throw new Error(
        `Chronicle section "${reader.module}" v${stored.schemaVersion} has no upgrade path to v${reader.schemaVersion}`,
      );
    }

    const replaced = await this.snapshots.replaceSection(
      snapshot.id,
      await this.compute(reader, ownerId, period),
      now,
    );

    return { ...replaced, module: reader.module };
  }

  private computeAll(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ChronicleSectionToStore[]> {
    return Promise.all(
      this.readers.all().map((reader) => this.compute(reader, ownerId, period)),
    );
  }

  private async compute(
    reader: ChronicleSectionReader,
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ChronicleSectionToStore> {
    return {
      module: reader.module,
      schemaVersion: reader.schemaVersion,
      data: await reader.getSummary(ownerId, period),
    };
  }
}

function toSectionData(
  sections: ChronicleSectionToStore[],
): ChronicleSectionDataByModule {
  return Object.fromEntries(
    sections.map((section) => [section.module, section.data]),
  ) as unknown as ChronicleSectionDataByModule;
}
