export class GetJournalSummaryQuery {
  constructor(
    public readonly ownerId: string,
    public readonly now: Date = new Date(),
  ) {}
}
