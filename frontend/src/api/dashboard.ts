import { apiClient } from './client';

export interface ActivePeriod {
    start_date: string;
    end_date: string | null;
}

export interface WeeklyCompletion {
    week: number;
    completion_date: string;
}

export interface DailyTask {
    task_id: string;
    title: string;
    description: string | null;
    task_type: 'DAILY';
    progress: string;
    active_period: ActivePeriod[];
}

export interface WeeklyTask {
    task_id: string;
    title: string;
    description: string | null;
    task_type: 'WEEKLY';
    progress: string;
    weekly_completions: WeeklyCompletion[];
    active_period: ActivePeriod[];
}

export interface DeadlineTask {
    task_id: string;
    title: string;
    description: string | null;
    task_type: 'DEADLINE';
    deadline: {
        start_date: string;
        deadline_date: string;
        completed: boolean;
        completed_at: string | null;
    };
}

export type DashboardTask = DailyTask | WeeklyTask | DeadlineTask;

export interface DashboardActivity {
    date: string;
    count: number;
}

export interface DashboardResponse {
    year: number;
    month: number;
    tasks: DashboardTask[];
    activity: DashboardActivity[];
}

export interface YearlyActivityResponse {
  activity: DashboardActivity[];
}

export async function getActivity(): Promise<YearlyActivityResponse> {
  const { data } = await apiClient.get<YearlyActivityResponse>('/dashboard/activity');
  return data;
}

export async function getDashboard(year: number, month: number): Promise<DashboardResponse> {
    const { data } = await apiClient.get<DashboardResponse>('/dashboard/', {
        params: { year, month },
    });
    return data;
}