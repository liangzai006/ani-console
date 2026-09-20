import type { NavigateFn } from "@tanstack/react-router";

export type ResourceDetailType =
  | "model"
  | "inference-service"
  | "vm-instance"
  | "container-instance"
  | "gpu-instance"
  | "sandbox-instance"
  | "k8s-cluster"
  | "knowledge-base"
  | "vpc"
  | "subnet"
  | "security-group"
  | "network-route"
  | "load-balancer"
  | "volume"
  | "filesystem"
  | "bucket"
  | "vector-store";

export type KnowledgeBaseDetailSearch = {
  tab: "overview" | "documents" | "chat" | "permissions" | "history";
};

export type VectorStoreDetailSearch = {
  tab: "search" | "related" | undefined;
};

export type ResourceDetailSearch = KnowledgeBaseDetailSearch | VectorStoreDetailSearch;

export type ResourceDetailTypeWithoutSearch = Exclude<
  ResourceDetailType,
  "knowledge-base" | "vector-store"
>;

export type ResourceDetailTarget =
  | { type: ResourceDetailTypeWithoutSearch; id: string }
  | { type: "knowledge-base"; id: string; search: KnowledgeBaseDetailSearch }
  | { type: "vector-store"; id: string; search: VectorStoreDetailSearch };

export function navigateToResourceDetail(
  navigate: NavigateFn,
  resource: ResourceDetailTarget,
): void {
  switch (resource.type) {
    case "model":
      void navigate({ to: "/models/$modelId", params: { modelId: resource.id } });
      return;
    case "inference-service":
      void navigate({ to: "/inference/$serviceId", params: { serviceId: resource.id } });
      return;
    case "vm-instance":
      void navigate({ to: "/vm-instances/$instanceId", params: { instanceId: resource.id } });
      return;
    case "container-instance":
      void navigate({
        to: "/container-instances/$instanceId",
        params: { instanceId: resource.id },
      });
      return;
    case "gpu-instance":
      void navigate({ to: "/gpu-instances/$instanceId", params: { instanceId: resource.id } });
      return;
    case "sandbox-instance":
      void navigate({ to: "/sandbox-instances/$instanceId", params: { instanceId: resource.id } });
      return;
    case "k8s-cluster":
      void navigate({ to: "/k8s-clusters/$clusterId", params: { clusterId: resource.id } });
      return;
    case "knowledge-base":
      void navigate({
        to: "/kb/$kbId",
        params: { kbId: resource.id },
        search: resource.search,
      });
      return;
    case "vpc":
      void navigate({ to: "/vpcs/$vpcId", params: { vpcId: resource.id } });
      return;
    case "subnet":
      void navigate({ to: "/subnets/$subnetId", params: { subnetId: resource.id } });
      return;
    case "security-group":
      void navigate({
        to: "/security-groups/$securityGroupId",
        params: { securityGroupId: resource.id },
      });
      return;
    case "network-route":
      void navigate({ to: "/routes/$routeId", params: { routeId: resource.id } });
      return;
    case "load-balancer":
      void navigate({
        to: "/load-balancers/$loadBalancerId",
        params: { loadBalancerId: resource.id },
      });
      return;
    case "volume":
      void navigate({ to: "/volumes/$volumeId", params: { volumeId: resource.id } });
      return;
    case "filesystem":
      void navigate({
        to: "/filesystems/$filesystemId",
        params: { filesystemId: resource.id },
      });
      return;
    case "bucket":
      void navigate({ to: "/objects/$bucketId", params: { bucketId: resource.id } });
      return;
    case "vector-store":
      void navigate({
        to: "/vector-stores/$vectorStoreId",
        params: { vectorStoreId: resource.id },
        search: resource.search,
      });
  }
}
