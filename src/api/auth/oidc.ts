import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { AuthTokenPair, CompleteOidcLoginInput, CompleteOidcLoginRequest } from "./types";

const inflight = new Map<string, Promise<AuthTokenPair>>();
const exchangeScope = createIdempotencyScope("auth-oidc-exchange", ["POST"]);

export function exchangeOidcCode(
  code: string,
  state: string,
  redirectUri: string,
): Promise<AuthTokenPair> {
  const runtimeDependencies = [code, state, redirectUri] as const;
  const key = JSON.stringify(runtimeDependencies);
  const existing = inflight.get(key);
  if (existing) return existing;

  const submitData: CompleteOidcLoginInput = { code, state, redirect_uri: redirectUri };
  const promise = runIdempotentRequest(
    exchangeScope,
    submitData,
    (body) =>
      coreRequest<AuthTokenPair, CompleteOidcLoginRequest>("/auth/token", {
        method: "POST",
        auth: "public",
        data: body,
      }),
    runtimeDependencies,
  )
    .then((tokens) => {
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error("登录失败：未返回 access_token");
      }
      return tokens;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
