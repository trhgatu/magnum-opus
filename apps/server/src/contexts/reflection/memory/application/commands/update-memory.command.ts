import { ICommand } from '@nestjs/cqrs';

import { MemoryDatePrecision } from '../../domain/enums';

export class UpdateMemoryCommand implements ICommand {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
    public readonly title: string,
    public readonly content: string,
    public readonly occurredOn: string | null,
    public readonly occurredOnPrecision: MemoryDatePrecision,
  ) {}
}
