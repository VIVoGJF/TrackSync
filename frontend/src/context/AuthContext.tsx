import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearToken, getToken, setToken as persistToken } from '../api/client';
import { getCurrentUser, login as loginRequest, type CurrentUser } from '../api/auth';
import { getActivity, getDashboard } from '../api/dashboard';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  /** Patches the cached user in memory. Never refetches /auth/me — call
   *  this after any mutation (username, display name, avatar) that
   *  changes what /auth/me would return. */
  updateUser: (patch: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

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
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    queryClient.prefetchQuery({
      queryKey: ['dashboard', year, month],
      queryFn: () => getDashboard(year, month),
    });

    queryClient.prefetchQuery({
      queryKey: ['activity'],
      queryFn: () => getActivity(),
    });
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  function updateUser(patch: Partial<CurrentUser>) {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
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