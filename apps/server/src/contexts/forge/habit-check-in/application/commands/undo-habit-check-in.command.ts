export class UndoHabitCheckInCommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
