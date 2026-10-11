import { IQuery } from '@nestjs/cqrs';

import { ChronicleSectionDataByModule } from '../section-data';

export class GetMonthlyChronicleQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly year: number,
    public readonly month: number,
  ) {}
}

export interface MonthlyChronicleReadModel {
  year: number;
  month: number;
  computedAt: Date;
  sections: ChronicleSectionDataByModule;
}
