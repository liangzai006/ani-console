export interface CoreDevProfileInfo {
  mode: "local" | "real";
  provider: string;
  real_provider: boolean;
  reason?: string | null;
}

export interface CursorPageParams {
  limit?: number;
  cursor?: string;
}
