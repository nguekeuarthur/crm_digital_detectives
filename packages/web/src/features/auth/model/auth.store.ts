import { create } from 'zustand';
import { api } from '../../../shared/api/base';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  require2FA: boolean;
  tempUserId: string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setRequire2FA: (userId: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  require2FA: false,
  tempUserId: null,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, require2FA: false, tempUserId: null });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, require2FA: false, tempUserId: null });
  },

  setRequire2FA: (userId) => {
    set({ require2FA: true, tempUserId: userId });
  }
}));
