import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type RegistryPurpose = "container" | "gpu" | "sandbox" | "system";
export type RegistryScanState = "not_scanned" | "pending" | "running" | "complete" | "failed";

export interface RegistryScanResult {
  image: string;
  status: RegistryScanState;
  critical: number;
  high: number;
  medium: number;
  low: number;
  report_url?: string;
  provider_id?: string;
  dev_profile?: CoreDevProfileInfo;
  scanned_at?: string;
}

export interface RegistryProject {
  id: string;
  tenant_id: string;
  name: string;
  public: boolean;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
}

export interface RegistryProjectListResponse {
  items: RegistryProject[];
  total: number;
  next_cursor?: string | null;
}

export interface RegistryRepository {
  project: string;
  name: string;
  artifact_count: number;
  pull_count: number;
  permission?: { actions?: string[] };
  dev_profile?: CoreDevProfileInfo;
}
export interface RegistryRepositoryListResponse {
  items: RegistryRepository[];
  total: number;
  next_cursor?: string | null;
}
export interface RegistryArtifact {
  project: string;
  repository: string;
  digest: string;
  tags: string[];
  media_type: string;
  size_bytes: number;
  pushed_at?: string;
  scan_status?: RegistryScanResult;
  dev_profile?: CoreDevProfileInfo;
}
export interface RegistryArtifactListResponse {
  items: RegistryArtifact[];
  total: number;
  next_cursor?: string | null;
}

export interface RegistryImage {
  name?: string | null;
  project: string;
  repository: string;
  tag: string;
  purpose?: RegistryPurpose;
  image: string;
  registry?: string;
  digest: string;
  media_type?: string;
  size_bytes: number;
  pull_command?: string;
  pushed_at: string;
  scan_status: RegistryScanResult;
  dev_profile?: CoreDevProfileInfo;
}

export interface RegistryImageListParams extends CursorPageParams {
  keyword?: string;
  project?: string;
  repository?: string;
  tag?: string;
  purpose?: RegistryPurpose;
  scan_status?: RegistryScanState;
}

export interface RegistryImageListResponse {
  items: RegistryImage[];
  total: number;
  next_cursor?: string | null;
}

export interface RegistryPushInstructions {
  project: string;
  registry: string;
  repository_example: string;
  commands: Array<{ label: string; command: string }>;
  dev_profile?: CoreDevProfileInfo;
}

export interface RegistryTagDeleteResult {
  project: string;
  repository: string;
  tag: string;
  digest: string;
  deleted_at: string;
}
