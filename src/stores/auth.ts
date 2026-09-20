import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";

import { authStorage } from "@/lib/storage";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}

export interface AuthSession {
  tokens: AuthTokens;
  username: string | null;
}

interface AuthState {
  tokens: AuthTokens | null;
  username: string | null;
  hasKnownUsername: boolean;
  developmentBypass: boolean;
  hydrated: boolean;
  setAuthSession: (session: AuthSession | null) => void;
  setDevelopmentBypass: (enabled: boolean) => void;
  clear: () => void;
  getAccessToken: () => string | null;
  getAccessTokenJti: () => string | null;
  setHydrated: (hydrated: boolean) => void;
}

const authStateStorage: StateStorage = {
  async getItem(name) {
    try {
      return await authStorage.getItem<string>(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    try {
      await authStorage.setItem(name, value);
    } catch {
      // Authentication remains usable for the lifetime of the page.
    }
  },
  async removeItem(name) {
    try {
      await authStorage.removeItem(name);
    } catch {
      // The in-memory Zustand state has still been cleared.
    }
  },
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtJti(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.jti === "string" && payload.jti ? payload.jti : null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      username: null,
      hasKnownUsername: false,
      developmentBypass: false,
      hydrated: false,
      setAuthSession: (session) => {
        const username = session?.username?.trim() || null;
        set({
          tokens: session?.tokens ?? null,
          username,
          hasKnownUsername: username !== null,
          developmentBypass: false,
        });
      },
      setDevelopmentBypass: (enabled) =>
        set(() => {
          const active = import.meta.env.DEV && enabled;
          return {
            developmentBypass: active,
            username: active ? "admin" : null,
            hasKnownUsername: active,
          };
        }),
      clear: () =>
        set({
          tokens: null,
          username: null,
          hasKnownUsername: false,
          developmentBypass: false,
        }),
      getAccessToken: () => get().tokens?.access_token ?? null,
      getAccessTokenJti: () => {
        const token = get().tokens?.access_token;
        return token ? getJwtJti(token) : null;
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "ani-console-auth",
      storage: createJSONStorage(() => authStateStorage),
      partialize: (state) => ({
        tokens: state.tokens,
        username: state.username,
        hasKnownUsername: state.hasKnownUsername,
        developmentBypass: state.developmentBypass,
      }),
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);

export function isAuthHydrated(): boolean {
  return useAuthStore.getState().hydrated;
}

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().tokens?.access_token || isDevelopmentAuthBypassActive();
}

export function isDevelopmentAuthBypassActive(): boolean {
  return import.meta.env.DEV && useAuthStore.getState().developmentBypass;
}
