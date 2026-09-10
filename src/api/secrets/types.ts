import type { CursorPageParams } from "@/api/types";
export interface Secret {
  id: string;
  tenant_id?: string;
  name: string;
  type?: string;
  state?: string;
  keys?: string[];
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
export interface SecretListParams extends CursorPageParams {
  keyword?: string;
}
export interface SecretListResponse {
  items: Secret[];
  total: number;
  next_cursor?: string | null;
}
