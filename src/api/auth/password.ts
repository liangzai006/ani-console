import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { AuthTokenPair, PasswordLoginInput, PasswordLoginRequest } from "./types";

const loginScope = createIdempotencyScope("auth-password-login", ["POST"]);

export async function passwordLogin(submitData: PasswordLoginInput): Promise<AuthTokenPair> {
  const tokens = await runIdempotentRequest(loginScope, submitData, (body) =>
    coreRequest<AuthTokenPair, PasswordLoginRequest>("/auth/password/login", {
      method: "POST",
      auth: "public",
      data: body,
    }),
  );
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("登录响应缺少令牌");
  }
  return tokens;
}
