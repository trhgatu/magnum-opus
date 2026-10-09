import {
  ChronicleMonthInFutureException,
  InvalidChronicleMonthException,
} from '../../../domain/exceptions';
import { ChronicleSectionReader } from '../../ports/chronicle-section-reader.port';
import {
  ChronicleSnapshotRepository,
  StoredChronicleSnapshot,
} from '../../ports/chronicle-snapshot.repository.port';
import { CHRONICLE_MODULES, ChronicleModule } from '../../section-data';
import { ChronicleSectionReaderRegistry } from '../../services/chronicle-section-reader-registry';

import { GetMonthlyChronicleQuery } from '../get-monthly-chronicle.query';

import { GetMonthlyChronicleHandler } from './get-monthly-chronicle.handler';

// "Bây giờ" = 15/9/2026 10:00 giờ Việt Nam.
const NOW = new Date('2026-09-15T03:00:00.000Z');
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

type FakeReader = ChronicleSectionReader & { getSummary: jest.Mock };

const makeReader = (
  module: ChronicleModule,
  overrides: Partial<ChronicleSectionReader> = {},
): FakeReader =>
  ({
    module,
    schemaVersion: 1,
    historyOnly: false,
    getSummary: jest.fn().mockResolvedValue({ fresh: module }),
    ...overrides,
  }) as FakeReader;

describe('GetMonthlyChronicleHandler', () => {
  let readers: FakeReader[];
  let snapshots: jest.Mocked<ChronicleSnapshotRepository>;
  let handler: GetMonthlyChronicleHandler;

  const build = () => {
    handler = new GetMonthlyChronicleHandler(
      { now: () => NOW },
      { getForUser: jest.fn().mockResolvedValue(TIME_ZONE) },
      snapshots,
      ChronicleSectionReaderRegistry.from(readers),
    );
  };

  const storedSnapshot = (
    sections: StoredChronicleSnapshot['sections'],
  ): StoredChronicleSnapshot => ({
    id: 'snapshot-id',
    computedAt: new Date('2026-09-01T02:00:00.000Z'),
    sections,
  });

  const storedAll = (): StoredChronicleSnapshot['sections'] =>
    CHRONICLE_MODULES.map((module) => ({
      module,
      schemaVersion: 1,
      data: { stored: module },
    }));

  beforeEach(() => {
    readers = CHRONICLE_MODULES.map((module) => makeReader(module));
    snapshots = {
      findForPeriod: jest.fn().mockResolvedValue(null),
      createOrGet: jest.fn(),
      addSectionOrGet: jest.fn(),
      replaceSection: jest.fn(),
    };
    build();
  });

  it('rejects an invalid month as a domain failure', async () => {
    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 13),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidChronicleMonthException);
  });

  it('rejects a month after the current month', async () => {
    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 10),
    );

    expect(result.getError()).toBeInstanceOf(ChronicleMonthInFutureException);
    expect(snapshots.findForPeriod).not.toHaveBeenCalled();
  });

  it('computes the current month live from every reader without touching snapshots', async () => {
    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 9),
    );

    expect(result.getValue()).toEqual({
      year: 2026,
      month: 9,
      computedAt: NOW,
      sections: Object.fromEntries(
        CHRONICLE_MODULES.map((module) => [module, { fresh: module }]),
      ),
    });
    expect(snapshots.findForPeriod).not.toHaveBeenCalled();
    expect(snapshots.createOrGet).not.toHaveBeenCalled();
    // Reader nhận đúng kỳ theo múi giờ owner.
    const [, period] = readers[0].getSummary.mock.calls[0];
    expect(period.key).toBe('2026-09');
    expect(period.timeZone).toBe(TIME_ZONE);
  });

  it('creates and returns a snapshot the first time a closed month is viewed', async () => {
    const created = storedSnapshot(
      CHRONICLE_MODULES.map((module) => ({
        module,
        schemaVersion: 1,
        data: { fresh: module },
      })),
    );
    snapshots.createOrGet.mockResolvedValue(created);

    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 8),
    );

    expect(snapshots.createOrGet).toHaveBeenCalledWith(
      'owner-id',
      expect.objectContaining({ key: '2026-08' }),
      NOW,
      CHRONICLE_MODULES.map((module) => ({
        module,
        schemaVersion: 1,
        data: { fresh: module },
      })),
    );
    expect(result.getValue().computedAt).toBe(created.computedAt);
    expect(result.getValue().sections.journal).toEqual({ fresh: 'journal' });
  });

  it('serves an existing snapshot without calling any reader', async () => {
    snapshots.findForPeriod.mockResolvedValue(storedSnapshot(storedAll()));

    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 8),
    );

    expect(result.getValue().sections.habit).toEqual({ stored: 'habit' });
    expect(result.getValue().computedAt).toEqual(
      new Date('2026-09-01T02:00:00.000Z'),
    );
    for (const reader of readers) {
      expect(reader.getSummary).not.toHaveBeenCalled();
    }
    expect(snapshots.createOrGet).not.toHaveBeenCalled();
  });

  it('fills in a section that the stored snapshot is missing (DAP-CHR-007)', async () => {
    snapshots.findForPeriod.mockResolvedValue(
      storedSnapshot(storedAll().filter((s) => s.module !== 'mood')),
    );
    snapshots.addSectionOrGet.mockResolvedValue({
      module: 'mood',
      schemaVersion: 1,
      data: { fresh: 'mood' },
    });

    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 8),
    );

    expect(snapshots.addSectionOrGet).toHaveBeenCalledTimes(1);
    expect(snapshots.addSectionOrGet).toHaveBeenCalledWith(
      'snapshot-id',
      { module: 'mood', schemaVersion: 1, data: { fresh: 'mood' } },
      NOW,
    );
    expect(result.getValue().sections.mood).toEqual({ fresh: 'mood' });
    expect(result.getValue().sections.journal).toEqual({ stored: 'journal' });
  });

  it('recomputes and replaces an outdated section of a history-only reader', async () => {
    readers = CHRONICLE_MODULES.map((module) =>
      module === 'project'
        ? makeReader(module, { schemaVersion: 2, historyOnly: true })
        : makeReader(module),
    );
    build();
    snapshots.findForPeriod.mockResolvedValue(storedSnapshot(storedAll()));
    snapshots.replaceSection.mockResolvedValue({
      module: 'project',
      schemaVersion: 2,
      data: { fresh: 'project' },
    });

    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 8),
    );

    expect(snapshots.replaceSection).toHaveBeenCalledWith(
      'snapshot-id',
      { module: 'project', schemaVersion: 2, data: { fresh: 'project' } },
      NOW,
    );
    expect(result.getValue().sections.project).toEqual({ fresh: 'project' });
  });

  it('never recomputes an outdated section of a reader that depends on current state', async () => {
    readers = CHRONICLE_MODULES.map((module) =>
      module === 'journal'
        ? makeReader(module, { schemaVersion: 2, historyOnly: false })
        : makeReader(module),
    );
    build();
    snapshots.findForPeriod.mockResolvedValue(storedSnapshot(storedAll()));

    await expect(
      handler.execute(new GetMonthlyChronicleQuery('owner-id', 2026, 8)),
    ).rejects.toThrow('has no upgrade path');
    expect(snapshots.replaceSection).not.toHaveBeenCalled();
  });

  it('fails loudly when a stored section is newer than its reader', async () => {
    snapshots.findForPeriod.mockResolvedValue(
      storedSnapshot(
        storedAll().map((s) =>
          s.module === 'habit' ? { ...s, schemaVersion: 3 } : s,
        ),
      ),
    );

    await expect(
      handler.execute(new GetMonthlyChronicleQuery('owner-id', 2026, 8)),
    ).rejects.toThrow('newer than reader');
  });

  it('ignores stored sections of modules no longer registered', async () => {
    snapshots.findForPeriod.mockResolvedValue(
      storedSnapshot([
        ...storedAll(),
        { module: 'retired', schemaVersion: 1, data: {} },
      ]),
    );

    const result = await handler.execute(
      new GetMonthlyChronicleQuery('owner-id', 2026, 8),
    );

    expect(Object.keys(result.getValue().sections)).toEqual([
      ...CHRONICLE_MODULES,
    ]);
  });
});
