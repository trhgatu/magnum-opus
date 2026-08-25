export class CheckInHabitCommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
