import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Inspector } from '../types';

interface AuthState {
  inspector: Inspector | null;
  isLoading: boolean;
  login: (inspector: Inspector, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  inspector: null,
  isLoading: true,

  login: async (inspector, token) => {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('inspector', JSON.stringify(inspector));
    set({ inspector: { ...inspector, token } });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('inspector');
    set({ inspector: null });
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const inspectorJson = await SecureStore.getItemAsync('inspector');
      if (token && inspectorJson) {
        const inspector = JSON.parse(inspectorJson) as Inspector;
        set({ inspector: { ...inspector, token } });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
