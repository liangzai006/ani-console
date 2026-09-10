import { coreRequest } from "@/api/request";
import type { SecretListParams, SecretListResponse } from "./types";
export function listSecrets(params: SecretListParams = {}): Promise<SecretListResponse> {
  return coreRequest<SecretListResponse>("/secrets", { method: "GET", params });
}
export type { Secret, SecretListParams, SecretListResponse } from "./types";
