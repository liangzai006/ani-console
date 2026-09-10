import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { LogoutInput, LogoutRequest, RevokeStatusResponse } from "./types";

const logoutScope = createIdempotencyScope("auth-logout", ["POST"]);

export function logout(submitData: LogoutInput): Promise<RevokeStatusResponse> {
  return runIdempotentRequest(logoutScope, submitData, (body) =>
    coreRequest<RevokeStatusResponse, LogoutRequest>("/auth/logout", {
      method: "POST",
      data: body,
    }),
  );
}
