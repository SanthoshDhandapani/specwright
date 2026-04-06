import { create } from 'zustand';
import type { GoogleUser } from '../types/movie';

const STORAGE_KEY = 'specwright-show-user';

interface AuthState {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  signIn: (user: GoogleUser) => void;
  signOut: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  signIn: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signOut: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as GoogleUser;
        set({ user, isAuthenticated: true });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
}));
