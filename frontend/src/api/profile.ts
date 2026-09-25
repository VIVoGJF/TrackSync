import { apiClient } from './client';

export interface ProfileUpdatePayload {
    username?: string;
    display_name?: string | null;
}

export interface ProfileUpdateResponse {
    username: string;
    display_name: string | null;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
    const { data } = await apiClient.patch<ProfileUpdateResponse>('/profile/', payload);
    return data;
}

export interface AvatarUploadResponse {
    avatar_uploaded: boolean;
    avatar_version: number;
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<AvatarUploadResponse>('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
}

export async function removeAvatar(): Promise<AvatarUploadResponse> {
    const { data } = await apiClient.delete<AvatarUploadResponse>('/profile/avatar');
    return data;
}
