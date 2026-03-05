import { create } from 'zustand';
import type { User } from '../types';
import { clearAuth, getAuthToken, saveAuthToken } from '../utils/localStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
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

  logout: () => {
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
