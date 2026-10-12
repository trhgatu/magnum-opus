import {
  InvalidClosingNoteException,
  InvalidProjectTitleException,
  InvalidProjectTransitionException,
} from './exceptions';
import { ProjectLifecycleState, ProjectCycleEndReason } from './enums';
import { Project } from './project.aggregate';

const createProject = (overrides?: { title?: string; description?: string }) =>
  Project.create({
    ownerId: 'owner-id',
    title: overrides?.title ?? 'Build Magnum Opus',
    description: overrides?.description,
  });

describe('Project', () => {
  describe('create', () => {
    it('creates a NOT_STARTED project at revision 1 with no cycles', () => {
      const project = createProject();

      expect(project.id).toBeTruthy();
      expect(project.ownerId).toBe('owner-id');
      expect(project.title).toBe('Build Magnum Opus');
      expect(project.lifecycleState).toBe(ProjectLifecycleState.NOT_STARTED);
      expect(project.revision).toBe(1);
      expect(project.cycles).toHaveLength(0);
      expect(project.currentCycle).toBeNull();
      expect(project.canBeDeleted()).toBe(true);
    });

    it('rejects a blank title', () => {
      expect(() => createProject({ title: '   ' })).toThrow(
        InvalidProjectTitleException,
      );
    });
  });

  describe('start', () => {
    it('moves NOT_STARTED to ACTIVE and opens Cycle 1', () => {
      const project = createProject();

      project.start();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.ACTIVE);
      expect(project.revision).toBe(2);
      expect(project.currentCycle).not.toBeNull();
      expect(project.currentCycle?.cycleNumber).toBe(1);
      expect(project.currentCycle?.isOpen).toBe(true);
      expect(project.canBeDeleted()).toBe(false);
    });

    it('rejects Start outside NOT_STARTED', () => {
      const project = createProject();
      project.start();

      expect(() => project.start()).toThrow(InvalidProjectTransitionException);
    });
  });

  describe('pause / resume', () => {
    it('pauses an ACTIVE project without closing the current Cycle', () => {
      const project = createProject();
      project.start();
      const cycleBefore = project.currentCycle;

      project.pause();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.PAUSED);
      expect(project.currentCycle?.id).toBe(cycleBefore?.id);
      expect(project.currentCycle?.isOpen).toBe(true);
    });

    it('resumes a PAUSED project back to ACTIVE in the same Cycle', () => {
      const project = createProject();
      project.start();
      project.pause();
      const cycleBefore = project.currentCycle;

      project.resume();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.ACTIVE);
      expect(project.currentCycle?.id).toBe(cycleBefore?.id);
    });

    it('rejects Pause outside ACTIVE', () => {
      const project = createProject();
      expect(() => project.pause()).toThrow(InvalidProjectTransitionException);
    });
  });

  describe('stop', () => {
    it('closes the current Cycle with STOPPED reason', () => {
      const project = createProject();
      project.start();

      project.stop();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.STOPPED);
      expect(project.currentCycle).toBeNull();
      expect(project.cycles[0].endReason).toBe(ProjectCycleEndReason.STOPPED);
      expect(project.cycles[0].isOpen).toBe(false);
    });

    it('creates no Cycle when stopping before the first Start', () => {
      const project = createProject();

      project.stop();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.STOPPED);
      expect(project.cycles).toHaveLength(0);
      expect(project.canBeDeleted()).toBe(true);
    });
  });

  describe('complete', () => {
    it('closes the current Cycle with COMPLETED reason', () => {
      const project = createProject();
      project.start();

      project.complete();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.COMPLETED);
      expect(project.cycles[0].endReason).toBe(ProjectCycleEndReason.COMPLETED);
    });

    it('is valid directly from PAUSED without resuming first', () => {
      const project = createProject();
      project.start();
      project.pause();

      expect(() => project.complete()).not.toThrow();
      expect(project.lifecycleState).toBe(ProjectLifecycleState.COMPLETED);
    });

    it('rejects Complete before the first Start', () => {
      const project = createProject();
      expect(() => project.complete()).toThrow(
        InvalidProjectTransitionException,
      );
    });
  });

  describe('reopen', () => {
    it('starts a new Cycle and returns to ACTIVE after STOPPED', () => {
      const project = createProject();
      project.start();
      project.stop();

      project.reopen();

      expect(project.lifecycleState).toBe(ProjectLifecycleState.ACTIVE);
      expect(project.cycles).toHaveLength(2);
      expect(project.currentCycle?.cycleNumber).toBe(2);
      expect(project.currentCycle?.intendedOutcome).toBeNull();
    });

    it('starts Cycle 1 when reopening a project that was stopped before ever starting', () => {
      const project = createProject();
      project.stop();

      project.reopen();

      expect(project.cycles).toHaveLength(1);
      expect(project.currentCycle?.cycleNumber).toBe(1);
    });

    it('preserves closed Cycles across multiple reopen cycles', () => {
      const project = createProject();
      project.start();
      project.stop();
      project.reopen();
      project.complete();
      project.reopen();

      expect(project.cycles).toHaveLength(3);
      expect(project.cycles[0].endReason).toBe(ProjectCycleEndReason.STOPPED);
      expect(project.cycles[1].endReason).toBe(ProjectCycleEndReason.COMPLETED);
      expect(project.cycles[2].isOpen).toBe(true);
    });

    it('rejects Reopen outside STOPPED/COMPLETED', () => {
      const project = createProject();
      project.start();

      expect(() => project.reopen()).toThrow(InvalidProjectTransitionException);
    });
  });

  describe('setIntendedOutcome', () => {
    it('sets the outcome on the current open Cycle while ACTIVE', () => {
      const project = createProject();
      project.start();

      project.setIntendedOutcome('Ship Projects V1');

      expect(project.currentCycle?.intendedOutcome).toBe('Ship Projects V1');
    });

    it('does not carry the previous Cycle outcome into a new one after reopen', () => {
      const project = createProject();
      project.start();
      project.setIntendedOutcome('Ship Projects V1');
      project.complete();

      project.reopen();

      expect(project.currentCycle?.intendedOutcome).toBeNull();
    });

    it('rejects setting an outcome when there is no open Cycle', () => {
      const project = createProject();

      expect(() => project.setIntendedOutcome('anything')).toThrow(
        InvalidProjectTransitionException,
      );
    });

    // V1.1 — BR-PRJ-032/033
    it('keeps every change as an append-only history instead of overwriting', () => {
      const project = createProject();
      project.start();

      project.setIntendedOutcome('Đàn Canon in D');
      project.setIntendedOutcome('Đàn Für Elise rút gọn');

      expect(
        project.currentCycle?.outcomeHistory.map((entry) => entry.outcome),
      ).toEqual(['Đàn Canon in D', 'Đàn Für Elise rút gọn']);
      expect(project.currentCycle?.intendedOutcome).toBe(
        'Đàn Für Elise rút gọn',
      );
    });

    it('does not bump the revision when the outcome is unchanged', () => {
      const project = createProject();
      project.start();
      project.setIntendedOutcome('Ship V1.1');
      const revision = project.revision;

      project.setIntendedOutcome('  Ship V1.1  ');

      expect(project.revision).toBe(revision);
      expect(project.currentCycle?.outcomeHistory).toHaveLength(1);
    });

    it('freezes the history once the Cycle closes', () => {
      const project = createProject();
      project.start();
      project.setIntendedOutcome('A');
      project.complete();

      expect(() => project.setIntendedOutcome('B')).toThrow(
        InvalidProjectTransitionException,
      );
      expect(
        project.cycles[0].outcomeHistory.map((entry) => entry.outcome),
      ).toEqual(['A']);
    });
  });

  // V1.1 — BR-PRJ-034/035
  describe('closing note', () => {
    it('stores the trimmed note on the Cycle closed by Stop', () => {
      const project = createProject();
      project.start();

      project.stop('  Chủ động đổi hướng  ');

      expect(project.cycles[0].closingNote).toBe('Chủ động đổi hướng');
    });

    it('stores the note on the Cycle closed by Complete', () => {
      const project = createProject();
      project.start();

      project.complete('Xong sớm hơn dự kiến');

      expect(project.cycles[0].closingNote).toBe('Xong sớm hơn dự kiến');
    });

    it('treats a blank note as no note', () => {
      const project = createProject();
      project.start();

      project.stop('   ');

      expect(project.cycles[0].closingNote).toBeNull();
    });

    it('rejects a note when stopping a project that never started', () => {
      const project = createProject();

      expect(() => project.stop('Không có chu kỳ để gắn')).toThrow(
        InvalidClosingNoteException,
      );
      expect(project.lifecycleState).toBe(ProjectLifecycleState.NOT_STARTED);
    });

    it('still stops a never-started project when the note is blank', () => {
      const project = createProject();

      project.stop('  ');

      expect(project.lifecycleState).toBe(ProjectLifecycleState.STOPPED);
    });

    it('rejects an oversized note without changing anything', () => {
      const project = createProject();
      project.start();
      const revision = project.revision;

      expect(() => project.complete('a'.repeat(2001))).toThrow(
        InvalidClosingNoteException,
      );
      expect(project.lifecycleState).toBe(ProjectLifecycleState.ACTIVE);
      expect(project.currentCycle?.isOpen).toBe(true);
      expect(project.revision).toBe(revision);
    });
  });

  // V1.1 — BR-PRJ-036/037
  describe('setTargetEndAt', () => {
    it('sets and clears the target end date of the open Cycle', () => {
      const project = createProject();
      project.start();

      project.setTargetEndAt('2026-08-31');
      expect(project.currentCycle?.targetEndAt).toBe('2026-08-31');

      project.setTargetEndAt(null);
      expect(project.currentCycle?.targetEndAt).toBeNull();
    });

    it('works while PAUSED and accepts a date in the past', () => {
      const project = createProject();
      project.start();
      project.pause();

      project.setTargetEndAt('2020-01-01');

      expect(project.currentCycle?.targetEndAt).toBe('2020-01-01');
    });

    it('does not bump the revision for the same value', () => {
      const project = createProject();
      project.start();
      project.setTargetEndAt('2026-08-31');
      const revision = project.revision;

      project.setTargetEndAt('2026-08-31');

      expect(project.revision).toBe(revision);
    });

    it('never changes the lifecycle state', () => {
      const project = createProject();
      project.start();

      project.setTargetEndAt('2020-01-01');

      expect(project.lifecycleState).toBe(ProjectLifecycleState.ACTIVE);
      expect(project.pullDomainEvents()).toHaveLength(1); // only the Start
    });

    it('is rejected without an open Cycle and preserved after closing', () => {
      const project = createProject();
      expect(() => project.setTargetEndAt('2026-08-31')).toThrow(
        InvalidProjectTransitionException,
      );

      project.start();
      project.setTargetEndAt('2026-08-31');
      project.stop();

      expect(project.cycles[0].targetEndAt).toBe('2026-08-31');
      expect(() => project.setTargetEndAt(null)).toThrow(
        InvalidProjectTransitionException,
      );
    });

    it('starts empty on a reopened Cycle', () => {
      const project = createProject();
      project.start();
      project.setTargetEndAt('2026-08-31');
      project.complete();

      project.reopen();

      expect(project.currentCycle?.targetEndAt).toBeNull();
      expect(project.currentCycle?.outcomeHistory).toEqual([]);
    });
  });

  describe('canBeDeleted', () => {
    it('is true only while the project has never had a Cycle', () => {
      const neverStarted = createProject();
      expect(neverStarted.canBeDeleted()).toBe(true);

      neverStarted.stop();
      expect(neverStarted.canBeDeleted()).toBe(true);

      const started = createProject();
      started.start();
      expect(started.canBeDeleted()).toBe(false);

      started.stop();
      expect(started.canBeDeleted()).toBe(false);
    });
  });

  describe('update', () => {
    it('updates title and description regardless of lifecycle state', () => {
      const project = createProject();
      project.start();
      project.complete();
      const revisionBefore = project.revision;

      project.update({
        title: 'Build Magnum Opus V2',
        description: 'Refined scope',
      });

      expect(project.title).toBe('Build Magnum Opus V2');
      expect(project.description).toBe('Refined scope');
      expect(project.revision).toBe(revisionBefore + 1);
    });

    it('is a no-op when nothing actually changes', () => {
      const project = createProject({ description: 'same' });
      const revisionBefore = project.revision;

      project.update({ title: 'Build Magnum Opus', description: 'same' });

      expect(project.revision).toBe(revisionBefore);
    });
  });
});
