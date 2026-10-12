import { ProjectCycleEndReason } from './enums';
import { ProjectCycle } from './project-cycle.entity';
import { ClosingNote, IntendedOutcome } from './value-objects';

const firstSet = new Date('2026-08-02T03:00:00Z');
const secondSet = new Date('2026-08-20T03:00:00Z');

const openCycle = () =>
  ProjectCycle.create({ cycleNumber: 1, startedAt: firstSet });

describe('ProjectCycle', () => {
  it('starts with no outcome history, closing note or target end date', () => {
    const cycle = openCycle();

    expect(cycle.outcomeHistory).toEqual([]);
    expect(cycle.intendedOutcome).toBeNull();
    expect(cycle.closingNote).toBeNull();
    expect(cycle.targetEndAt).toBeNull();
  });

  describe('recordIntendedOutcome', () => {
    it('appends entries in order and exposes the latest as current', () => {
      const cycle = openCycle();

      expect(
        cycle.recordIntendedOutcome(
          IntendedOutcome.create('Đàn Canon in D'),
          firstSet,
        ),
      ).toBe(true);
      expect(
        cycle.recordIntendedOutcome(
          IntendedOutcome.create('Đàn Für Elise rút gọn'),
          secondSet,
        ),
      ).toBe(true);

      expect(cycle.outcomeHistory).toEqual([
        { sequence: 1, outcome: 'Đàn Canon in D', setAt: firstSet },
        { sequence: 2, outcome: 'Đàn Für Elise rút gọn', setAt: secondSet },
      ]);
      expect(cycle.intendedOutcome).toBe('Đàn Für Elise rút gọn');
    });

    it('is a no-op when the outcome equals the current one', () => {
      const cycle = openCycle();
      cycle.recordIntendedOutcome(
        IntendedOutcome.create('Ship V1.1'),
        firstSet,
      );

      expect(
        cycle.recordIntendedOutcome(
          IntendedOutcome.create('  Ship V1.1 '),
          secondSet,
        ),
      ).toBe(false);
      expect(cycle.outcomeHistory).toHaveLength(1);
    });

    it('allows going back to an earlier outcome as a new entry', () => {
      const cycle = openCycle();
      cycle.recordIntendedOutcome(IntendedOutcome.create('A'), firstSet);
      cycle.recordIntendedOutcome(IntendedOutcome.create('B'), firstSet);

      expect(
        cycle.recordIntendedOutcome(IntendedOutcome.create('A'), secondSet),
      ).toBe(true);
      expect(cycle.outcomeHistory.map((entry) => entry.sequence)).toEqual([
        1, 2, 3,
      ]);
    });

    it('does not let callers rewrite an entry timestamp through the snapshot', () => {
      const cycle = openCycle();
      cycle.recordIntendedOutcome(
        IntendedOutcome.create('A'),
        new Date('2026-08-02T03:00:00Z'),
      );

      cycle.outcomeHistory[0].setAt.setFullYear(1999);

      expect(cycle.outcomeHistory[0].setAt.toISOString()).toBe(
        '2026-08-02T03:00:00.000Z',
      );
    });

    it('does not let callers mutate the stored history', () => {
      const cycle = openCycle();
      cycle.recordIntendedOutcome(IntendedOutcome.create('A'), firstSet);

      (cycle.outcomeHistory as unknown[]).pop();

      expect(cycle.outcomeHistory).toHaveLength(1);
    });
  });

  describe('close', () => {
    it('records the end reason and the closing note at closing time', () => {
      const cycle = openCycle();

      cycle.close(
        ProjectCycleEndReason.STOPPED,
        ClosingNote.fromInput('Bỏ vì quá sức'),
      );

      expect(cycle.isOpen).toBe(false);
      expect(cycle.endReason).toBe(ProjectCycleEndReason.STOPPED);
      expect(cycle.closingNote).toBe('Bỏ vì quá sức');
    });

    it('closes without a note', () => {
      const cycle = openCycle();

      cycle.close(ProjectCycleEndReason.COMPLETED, null);

      expect(cycle.closingNote).toBeNull();
    });
  });

  describe('setTargetEndAt', () => {
    it('sets, replaces and clears the target end date', () => {
      const cycle = openCycle();

      expect(cycle.setTargetEndAt('2026-08-31')).toBe(true);
      expect(cycle.targetEndAt).toBe('2026-08-31');
      expect(cycle.setTargetEndAt('2026-09-15')).toBe(true);
      expect(cycle.setTargetEndAt(null)).toBe(true);
      expect(cycle.targetEndAt).toBeNull();
    });

    it('reports no change for the same value', () => {
      const cycle = openCycle();
      cycle.setTargetEndAt('2026-08-31');

      expect(cycle.setTargetEndAt('2026-08-31')).toBe(false);
      expect(openCycle().setTargetEndAt(null)).toBe(false);
    });
  });

  it('round-trips every field through primitives', () => {
    const cycle = openCycle();
    cycle.recordIntendedOutcome(IntendedOutcome.create('A'), firstSet);
    cycle.setTargetEndAt('2026-08-31');
    cycle.close(ProjectCycleEndReason.COMPLETED, ClosingNote.fromInput('Xong'));

    expect(cycle.toPrimitives()).toMatchObject({
      cycleNumber: 1,
      intendedOutcome: 'A',
      outcomeHistory: [{ sequence: 1, outcome: 'A', setAt: firstSet }],
      targetEndAt: '2026-08-31',
      closingNote: 'Xong',
      endReason: ProjectCycleEndReason.COMPLETED,
    });
  });
});
