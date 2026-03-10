import { create } from 'zustand';
import { authApi } from '../api/auth';
import type { User } from '../types';
import { clearAuth, getAuthToken, saveAuthToken } from '../utils/localStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  loadUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getAuthToken(),
  isAuthenticated: !!getAuthToken(),

  setAuth: (user, token) => {
    saveAuthToken(token);
    set({ user, token, isAuthenticated: true });
  },

  loadUser: async () => {
    if (!getAuthToken()) return;
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      clearAuth();
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  logout: () => {
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
