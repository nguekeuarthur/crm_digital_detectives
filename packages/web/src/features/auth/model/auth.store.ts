import { create } from 'zustand';
import { publicApi } from '../../../shared/api/base';
import { getAccessToken, setAccessToken } from '../../../shared/api/token';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  require2FA: boolean;
  tempUserId: string | null;
  isRestoringSession: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  setRequire2FA: (userId: string) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // accessToken est en mémoire uniquement — jamais dans localStorage
  accessToken: getAccessToken(),
  require2FA: false,
  tempUserId: null,
  isRestoringSession: false,

  setTokens: (accessToken, refreshToken) => {
    setAccessToken(accessToken);
    // refreshToken persiste pour restaurer la session après rechargement
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, require2FA: false, tempUserId: null });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await publicApi.post('/auth/logout', { refreshToken });
      } catch {
        // On ignore les erreurs de déconnexion côté serveur
      }
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, require2FA: false, tempUserId: null });
  },

  setRequire2FA: (userId) => {
    set({ require2FA: true, tempUserId: userId });
  },

  restoreSession: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    set({ isRestoringSession: true });
    try {
      const { data } = await publicApi.post('/auth/refresh', { refreshToken });
      setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({ accessToken: data.accessToken });
    } catch {
      // Refresh token invalide ou expiré — on nettoie
      localStorage.removeItem('refreshToken');
    } finally {
      set({ isRestoringSession: false });
    }
  },
}));
