export interface RoutineResponse {
  id: string;
  title: string;
  habitIds: string[];
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineDetailHabitResponse {
  id: string;
  title: string;
  isActive: boolean;
  order: number;
}

export interface RoutineDetailResponse {
  id: string;
  title: string;
  habits: RoutineDetailHabitResponse[];
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
