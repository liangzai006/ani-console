import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./core-schema";
import { isDevelopmentAuthBypassActive, useAuthStore } from "@/stores/auth";
import { createIdempotencyScope } from "@/lib/idempotency";

export const CORE_API_BASE = "/api/v1";

export const coreApi = createClient<paths>({
  baseUrl: CORE_API_BASE,
  credentials: "include",
});

const refreshScope = createIdempotencyScope("auth-refresh", ["POST"]);
let refreshRequest:
  | { refreshToken: string; promise: ReturnType<typeof requestTokenRefresh> }
  | undefined;

async function requestTokenRefresh(refreshToken: string) {
  const submitData = { refresh_token: refreshToken };
  const { data, error } = await coreApi.POST("/auth/refresh", {
    body: refreshScope.withKey(submitData, [refreshToken]),
  });
  if (error || !data?.access_token) throw error ?? new Error("刷新令牌响应缺少 access_token");
  refreshScope.reset([refreshToken]);
  return data;
}

function refreshAccessToken(refreshToken: string) {
  if (refreshRequest?.refreshToken === refreshToken) return refreshRequest.promise;
  const promise = requestTokenRefresh(refreshToken).finally(() => {
    if (refreshRequest?.promise === promise) refreshRequest = undefined;
  });
  refreshRequest = { refreshToken, promise };
  return promise;
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (window.location.pathname.startsWith("/login")) return;
  const target = `/login?redirect=${encodeURIComponent(current)}`;
  window.location.assign(target);
}

export function expireAuthSession() {
  useAuthStore.getState().clear();
  useAuthStore.persist.clearStorage();
  redirectToLogin();
}

function isPublicAuthRequest(request: Request): boolean {
  const path = new URL(request.url).pathname;
  return (
    path.endsWith("/auth/password/login") ||
    path.endsWith("/auth/oidc/begin") ||
    path.endsWith("/auth/token") ||
    path.endsWith("/auth/refresh")
  );
}

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (isPublicAuthRequest(request)) return request;
    const token = useAuthStore.getState().getAccessToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response, request }) {
    if (isPublicAuthRequest(request)) return response;
    if (response.status !== 401) return response;
    if (isDevelopmentAuthBypassActive()) return response;
    const refreshToken = useAuthStore.getState().tokens?.refresh_token;
    if (!refreshToken || request.url.includes("/auth/refresh")) {
      expireAuthSession();
      return response;
    }

    let data;
    try {
      data = await refreshAccessToken(refreshToken);
    } catch {
      expireAuthSession();
      return response;
    }

    useAuthStore.getState().setTokens({
      access_token: data.access_token,
      refresh_token: refreshToken,
      expires_in: data.expires_in,
    });

    const retry = request.clone();
    retry.headers.set("Authorization", `Bearer ${data.access_token}`);
    return fetch(retry);
  },
};

coreApi.use(authMiddleware);

export type CorePaths = paths;
