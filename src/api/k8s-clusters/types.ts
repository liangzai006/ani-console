import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type K8sClusterState = "provisioning" | "running" | "deleting";

export interface K8sCluster {
  id?: string;
  tenant_id?: string;
  name?: string;
  version?: string;
  state?: K8sClusterState;
  reason?: string;
  dev_profile?: CoreDevProfileInfo;
  created_at?: string;
  updated_at?: string;
}

export interface K8sClusterListParams extends CursorPageParams {
  status?: K8sClusterState;
  search_field?: "name" | "id";
  keyword?: string;
}

export interface K8sClusterListResponse {
  items?: K8sCluster[];
  total?: number;
  next_cursor?: string | null;
}

export interface CreateK8sClusterInput {
  name: string;
  version?: string;
}

export type CreateK8sClusterRequest = CreateK8sClusterInput & { idempotency_key: string };

export interface K8sClusterNodePoolGpu {
  vendor?: string;
  model?: string;
  count?: number;
  resource_name?: string;
}

export interface K8sClusterNodePool {
  id?: string;
  tenant_id?: string;
  cluster_id?: string;
  name?: string;
  node_count?: number;
  instance_type?: string;
  gpu?: K8sClusterNodePoolGpu;
  state?: "running" | "deleting";
  reason?: string;
  dev_profile?: CoreDevProfileInfo;
  created_at?: string;
  updated_at?: string;
}

export interface K8sClusterNodePoolListResponse {
  items?: K8sClusterNodePool[];
  total?: number;
  next_cursor?: string | null;
}

export interface K8sClusterWorkload {
  name: string;
  namespace: string;
  kind: "Deployment" | "StatefulSet" | "DaemonSet" | "Job" | "CronJob";
  replicas: number;
  ready_replicas: number;
  image?: string | null;
  status: "running" | "pending" | "failed" | "succeeded";
  created_at: string;
  dev_profile: CoreDevProfileInfo;
}

export interface K8sClusterWorkloadListResponse {
  items: K8sClusterWorkload[];
  total: number;
  next_cursor?: string | null;
}

export interface K8sClusterKubeconfig {
  cluster_id?: string;
  tenant_id?: string;
  server?: string;
  namespace?: string;
  ca_data?: string;
  token?: string;
  kubeconfig?: string;
  expires_at?: string;
  dev_profile?: CoreDevProfileInfo;
}
