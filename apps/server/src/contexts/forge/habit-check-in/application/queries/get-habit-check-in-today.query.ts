export class GetHabitCheckInTodayQuery {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
