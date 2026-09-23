import { apiClient } from './client';

export interface CreateCollectionRequest {
    name: string;
    task_ids: string[];
}

export interface CollectionResponse {
    id: string;
    name: string;
    task_ids: string[];
}

export async function createCollection(
    payload: CreateCollectionRequest,
): Promise<CollectionResponse> {
    const { data } = await apiClient.post<CollectionResponse>(
        '/collections/',
        payload,
    );

    return data;
}

export async function getCollection(
    collectionId: string,
): Promise<CollectionResponse> {
    const { data } = await apiClient.get<CollectionResponse>(
        `/collections/${collectionId}`,
    );

    return data;
}

export async function addTaskToCollection(
    collectionId: string,
    taskId: string,
): Promise<void> {
    await apiClient.post(
        `/collections/${collectionId}/tasks/${taskId}`,
    );
}

export async function removeTaskFromCollection(
    collectionId: string,
    taskId: string,
): Promise<void> {
    await apiClient.delete(
        `/collections/${collectionId}/tasks/${taskId}`,
    );
}

export async function deleteCollection(
    collectionId: string,
): Promise<void> {
    await apiClient.delete(`/collections/${collectionId}`);
}