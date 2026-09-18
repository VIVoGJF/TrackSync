import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({ baseURL });

const TOKEN_KEY = 'tracksync_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

// Attach the bearer token to every outgoing request, if we have one.
apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// A 401 anywhere means the token is dead — clear it so the app falls back
// to the logged-out state instead of retrying with a stale token forever.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearToken();
        }
        return Promise.reject(error);
    }
);
