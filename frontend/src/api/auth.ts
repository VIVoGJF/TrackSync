import { apiClient } from './client';

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface CurrentUser {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    avatar_uploaded: boolean;
    avatar_version: number;
    is_active: boolean;
    created_at: string;
}

export async function login(identifier: string, password: string): Promise<TokenResponse> {
    const body = new URLSearchParams();
    body.set('username', identifier);
    body.set('password', password);

    const { data } = await apiClient.post<TokenResponse>('/auth/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return data;
}

export async function signup(username: string, email: string, password: string): Promise<{ message: string; user_id: string }> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await apiClient.post('/auth/signup', { username, email, password, timezone });
    return data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
    const { data } = await apiClient.get<CurrentUser>('/auth/me');
    return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
    });
}
