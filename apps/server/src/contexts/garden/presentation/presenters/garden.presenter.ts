import type { GardenResponse } from '@repo/contracts';

import type { GardenResult } from '../../application/queries/handlers/get-garden.handler';

export class GardenPresenter {
  static toResponse(result: GardenResult): GardenResponse {
    return {
      today: result.today,
      trees: result.trees.map((tree) => ({
        id: tree.id,
        subjectKind: tree.subjectKind,
        subjectId: tree.subjectId,
        variant: tree.variant,
        name: tree.name,
        simVersion: tree.simVersion,
        plantedOn: tree.plantedOn,
        weeks: tree.weeks.map((week) => ({
          start: week.start,
          status: week.status,
          scarred: week.scarred,
        })),
        weeds: tree.weeds,
      })),
    };
  }
}
