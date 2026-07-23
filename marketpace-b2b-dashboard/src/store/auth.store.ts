import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { AuthResponse, AuthUser, UserRole } from '../lib/types';

interface RegisterPayload {
  email: string;
  password: string;
  role: UserRole;
  companyName: string;
  taxId?: string;
  phone?: string;
  address?: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  // providerId/buyerId se resuelven despues del login consultando el propio perfil,
  // ya que el backend no los incluye en el JWT (solo id/email/role).
  profileId: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  resolveProfileId: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      profileId: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthResponse>('/auth/login', {
            email,
            password,
          });
          set({ accessToken: data.accessToken, user: data.user });
          await get().resolveProfileId();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthResponse>('/auth/register', payload);
          set({ accessToken: data.accessToken, user: data.user });
          await get().resolveProfileId();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ accessToken: null, user: null, profileId: null });
      },

      // Para proveedor/comprador, resuelve su propio providerId/buyerId via el
      // endpoint de autoservicio "/me" (no via el listado completo, que tiene
      // restricciones de rol distintas: comprador no puede listar /buyers, y
      // proveedor no puede listar /providers).
      resolveProfileId: async () => {
        const { user } = get();
        if (!user || user.role === 'admin') return;

        const endpoint = user.role === 'proveedor' ? '/providers/me' : '/buyers/me';
        const { data } = await api.get<{ id: string } | null>(endpoint);
        set({ profileId: data?.id ?? null });
      },
    }),
    {
      name: 'marketplace-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        profileId: state.profileId,
      }),
    },
  ),
);
