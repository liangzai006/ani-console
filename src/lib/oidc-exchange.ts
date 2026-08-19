import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import type { AuthTokens } from '@/stores/auth'

const inflight = new Map<string, Promise<AuthTokens>>()

export function exchangeOidcCode(code: string, state: string, redirectUri: string): Promise<AuthTokens> {
  const key = `${code}:${state}`
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = coreApi
    .POST('/auth/token', { body: { code, state, redirect_uri: redirectUri, idempotency_key: newIdempotencyKey() } })
    .then(({ data, error }) => {
      if (error || !data?.access_token || !data.refresh_token) {
        throw error ?? new Error('登录失败：未返回 access_token')
      }
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      }
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
