import type {
  ForgeTodayHabitResponse,
  ForgeTodayResponse,
} from "@repo/contracts";

export type TodayCheckInState = Record<string, boolean>;

export function createTodayCheckInState(
  today: ForgeTodayResponse,
): TodayCheckInState {
  const state: TodayCheckInState = {};

  const register = (habit: ForgeTodayHabitResponse): void => {
    state[habit.id] = habit.checkedIn;
  };

  for (const routine of today.routines) {
    for (const habit of routine.habits) {
      register(habit);
    }
  }

  for (const habit of today.standaloneHabits) {
    register(habit);
  }
  return state;
}

export function updateTodayCheckInState(
  state: TodayCheckInState,
  habitId: string,
  checkedIn: boolean,
): TodayCheckInState {
  if (!(habitId in state)) {
    return state;
  }

  if (state[habitId] === checkedIn) {
    return state;
  }

  return {
    ...state,
    [habitId]: checkedIn,
  };
}
