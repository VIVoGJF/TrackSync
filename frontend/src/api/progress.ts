import { apiClient } from './client';

export interface ProgressResponse {
    task_id: string;
    date: string;
    status: number;
}

export async function updateProgress(taskId: string, date: string): Promise<ProgressResponse> {
    const { data } = await apiClient.patch<ProgressResponse>(`/progress/${taskId}`, { date });
    return data;
}