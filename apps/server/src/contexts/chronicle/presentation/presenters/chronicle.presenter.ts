import type { ChronicleResponse } from '@repo/contracts';

import type { MonthlyChronicleReadModel } from '../../application/queries';

export class ChroniclePresenter {
  public static toResponse(
    chronicle: MonthlyChronicleReadModel,
  ): ChronicleResponse {
    const { habit, routine, project, journal, mood, memory } =
      chronicle.sections;

    return {
      year: chronicle.year,
      month: chronicle.month,
      computedAt: chronicle.computedAt.toISOString(),
      habit,
      routine,
      project,
      journal,
      mood,
      memory,
    };
  }
}
