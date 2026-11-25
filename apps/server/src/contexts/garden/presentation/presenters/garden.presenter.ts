import type { GardenResponse } from '@repo/contracts';

import type { GardenResult } from '../../application/queries/handlers/get-garden.handler';

export class GardenPresenter {
  static toResponse(result: GardenResult): GardenResponse {
    return {
      today: result.today,
      light: result.light,
      lanterns: result.lanterns.map((lantern) => ({
        id: lantern.id,
        memoryId: lantern.memoryId,
        occurredOn: lantern.occurredOn,
        precision: lantern.precision,
        placedOn: lantern.placedOn,
      })),
      trees: result.trees.map((tree) => ({
        id: tree.id,
        subjectKind: tree.subjectKind,
        subjectId: tree.subjectId,
        variant: tree.variant,
        name: tree.name,
        nameAtPlanting: tree.nameAtPlanting,
        bed: tree.bed,
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
