export interface HabitCheckInResponse {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export interface HabitCheckInHistoryResponse {
  habitId: string;
  from: string;
  to: string;
  dates: string[];
}
