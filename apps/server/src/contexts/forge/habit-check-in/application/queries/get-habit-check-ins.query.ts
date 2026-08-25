export class GetHabitCheckInsQuery {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly from: string,
    public readonly to: string,
  ) {}
}
