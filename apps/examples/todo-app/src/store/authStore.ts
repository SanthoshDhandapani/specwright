import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const VALID_EMAIL = 'demo@specwright.dev';
const VALID_PASSWORD = 'Specwright2026!';

interface AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      login: (email: string, password: string): boolean => {
        if (email === VALID_EMAIL && password === VALID_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false });
      },
    }),
    {
      name: 'todo-app-token',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);
