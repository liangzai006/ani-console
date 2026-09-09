import { coreApi } from "@/api/client";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { AuthTokens } from "@/stores/auth";

const inflight = new Map<string, Promise<AuthTokens>>();
const exchangeScope = createIdempotencyScope("auth-oidc-exchange", ["POST"]);

export function exchangeOidcCode(
  code: string,
  state: string,
  redirectUri: string,
): Promise<AuthTokens> {
  const runtimeDependencies = [code, state, redirectUri] as const;
  const key = JSON.stringify(runtimeDependencies);
  const existing = inflight.get(key);
  if (existing) return existing;

  const submitData = { code, state, redirect_uri: redirectUri };
  const promise = coreApi
    .POST("/auth/token", { body: exchangeScope.withKey(submitData, runtimeDependencies) })
    .then(({ data, error }) => {
      if (error || !data?.access_token || !data.refresh_token) {
        throw error ?? new Error("登录失败：未返回 access_token");
      }
      exchangeScope.reset(runtimeDependencies);
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      };
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
