import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateK8sClusterInput,
  CreateK8sClusterRequest,
  K8sCluster,
  K8sClusterKubeconfig,
  K8sClusterListParams,
  K8sClusterListResponse,
  K8sClusterNodePoolListResponse,
  K8sClusterWorkloadListResponse,
} from "./types";

const createScope = createIdempotencyScope("k8s-cluster-create", ["POST"]);
const clusterPath = (clusterId: string) => `/k8s-clusters/${encodeURIComponent(clusterId)}`;

export function listK8sClusters(
  params: K8sClusterListParams = {},
): Promise<K8sClusterListResponse> {
  return coreRequest<K8sClusterListResponse>("/k8s-clusters", { method: "GET", params });
}

export function createK8sCluster(submitData: CreateK8sClusterInput): Promise<K8sCluster> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<K8sCluster, CreateK8sClusterRequest>("/k8s-clusters", {
      method: "POST",
      data: body,
    }),
  );
}

export function getK8sCluster(clusterId: string): Promise<K8sCluster> {
  return coreRequest<K8sCluster>(clusterPath(clusterId), { method: "GET" });
}

export function deleteK8sCluster(clusterId: string): Promise<K8sCluster> {
  return coreRequest<K8sCluster>(clusterPath(clusterId), { method: "DELETE" });
}

export function getK8sClusterKubeconfig(clusterId: string): Promise<K8sClusterKubeconfig> {
  return coreRequest<K8sClusterKubeconfig>(`${clusterPath(clusterId)}/kubeconfig`, {
    method: "GET",
  });
}

export function listK8sClusterNodePools(
  clusterId: string,
): Promise<K8sClusterNodePoolListResponse> {
  return coreRequest<K8sClusterNodePoolListResponse>(`${clusterPath(clusterId)}/node-pools`, {
    method: "GET",
  });
}

export function listK8sClusterWorkloads(
  clusterId: string,
): Promise<K8sClusterWorkloadListResponse> {
  return coreRequest<K8sClusterWorkloadListResponse>(`${clusterPath(clusterId)}/workloads`, {
    method: "GET",
  });
}

export type {
  CreateK8sClusterInput,
  CreateK8sClusterRequest,
  K8sCluster,
  K8sClusterKubeconfig,
  K8sClusterListParams,
  K8sClusterListResponse,
  K8sClusterNodePool,
  K8sClusterNodePoolGpu,
  K8sClusterNodePoolListResponse,
  K8sClusterState,
  K8sClusterWorkload,
  K8sClusterWorkloadListResponse,
} from "./types";
