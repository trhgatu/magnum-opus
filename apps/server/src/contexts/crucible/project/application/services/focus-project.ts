import type { FocusCandidate } from '../ports/project-reader.port';

export function chooseFocusProject(
  candidates: FocusCandidate[],
): FocusCandidate | null {
  const startedAt = (candidate: FocusCandidate) =>
    candidate.project.currentCycle?.startedAt.getTime() ?? 0;

  return (
    [...candidates].sort((a, b) => {
      const aActivity = a.lastActivityAt?.getTime() ?? null;
      const bActivity = b.lastActivityAt?.getTime() ?? null;
      if (aActivity !== bActivity) {
        if (aActivity === null) return 1;
        if (bActivity === null) return -1;
        return bActivity - aActivity;
      }
      return startedAt(b) - startedAt(a);
    })[0] ?? null
  );
}
