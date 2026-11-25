import type { OnThisDayKind } from '@repo/contracts';

export class OpenOnThisDayItemCommand {
  constructor(
    public readonly ownerId: string,
    public readonly kind: OnThisDayKind,
    public readonly itemId: string,
    public readonly now: Date = new Date(),
  ) {}
}
