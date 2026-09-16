import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearToken, getToken, setToken as persistToken } from '../api/client';
import { getCurrentUser, login as loginRequest, type CurrentUser } from '../api/auth';

interface AuthContextValue {
    user: CurrentUser | null;
    isLoading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setIsLoading(false);
            return;
        }

        getCurrentUser()
            .then(setUser)
            .catch(() => clearToken())
            .finally(() => setIsLoading(false));
    }, []);

    async function login(identifier: string, password: string) {
        const { access_token } = await loginRequest(identifier, password);
        persistToken(access_token);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
    }

    function logout() {
        clearToken();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
