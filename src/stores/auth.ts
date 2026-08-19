import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in?: number
  token_type?: string
}

interface AuthState {
  tokens: AuthTokens | null
  hydrated: boolean
  setTokens: (tokens: AuthTokens | null) => void
  clear: () => void
  getAccessToken: () => string | null
  getAccessTokenJti: () => string | null
  setHydrated: (hydrated: boolean) => void
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function getJwtJti(token: string): string | null {
  const payload = decodeJwtPayload(token)
  return typeof payload?.jti === 'string' && payload.jti ? payload.jti : null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      hydrated: false,
      setTokens: (tokens) => set({ tokens }),
      clear: () => set({ tokens: null }),
      getAccessToken: () => get().tokens?.access_token ?? null,
      getAccessTokenJti: () => {
        const token = get().tokens?.access_token
        return token ? getJwtJti(token) : null
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'ani-console-auth',
      partialize: (state) => ({ tokens: state.tokens }),
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true })
      },
    },
  ),
)

export function isAuthHydrated(): boolean {
  return useAuthStore.getState().hydrated
}

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().tokens?.access_token
}
