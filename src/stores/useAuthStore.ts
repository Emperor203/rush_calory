import { create } from 'zustand';
import { User } from '../lib/types';
import { apiFetch } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (loginOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  updateUserClan: (clanId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('turf_token') : null,
  isLoading: false,
  error: null,

  login: async (loginOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginOrEmail, password }),
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('turf_token', data.token);
      }
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('turf_token', data.token);
      }
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('turf_token');
    }
    set({ user: null, token: null });
  },

  loadProfile: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const user = await apiFetch<User>('/auth/me', {}, token);
      set({ user });
    } catch {
      get().logout();
    }
  },

  updateUserClan: (clanId: string) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, clanId } });
    }
  },
}));
