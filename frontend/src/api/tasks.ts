import { apiClient } from './client';

export type TaskType = 'DAILY' | 'WEEKLY' | 'DEADLINE';

export interface CreateTaskRequest {
    title: string;
    description?: string;
    task_type: TaskType;
    deadline?: string;
}

export interface TaskResponse {
    id: string;
    title: string;
    description: string | null;
    task_type: TaskType;
    created_at: string;
}

export interface DeadlineUpdateRequest {
    deadline: string;
}

export async function createTask(
    payload: CreateTaskRequest,
): Promise<TaskResponse> {
    const { data } = await apiClient.post<TaskResponse>(
        '/tasks/',
        payload,
    );

    return data;
}

export async function updateTaskDeadline(
    taskId: string,
    payload: DeadlineUpdateRequest,
): Promise<TaskResponse> {
    const { data } = await apiClient.patch<TaskResponse>(
        `/tasks/${taskId}/deadline`,
        payload,
    );

    return data;
}

export async function getTasks(): Promise<TaskResponse[]> {
    const { data } = await apiClient.get<TaskResponse[]>('/tasks/');
    return data;
}

export async function archiveTask(taskId: string): Promise<void> {
    await apiClient.patch(`/tasks/${taskId}/archive`);
}

export async function deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
}

export async function getArchivedTasks(): Promise<TaskResponse[]> {
    const { data } = await apiClient.get<TaskResponse[]>(
        '/tasks/archived',
    );

    return data;
}

export async function restoreTask(taskId: string): Promise<void> {
    await apiClient.patch(`/tasks/${taskId}/restore`);
}