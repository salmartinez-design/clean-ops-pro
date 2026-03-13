import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('cleanops_token'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('cleanops_token', token);
    } else {
      localStorage.removeItem('cleanops_token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('cleanops_token');
    set({ token: null });
    window.location.href = '/login';
  },
}));

export function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
