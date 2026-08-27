import type { components } from "@/api/core-schema";
type ListSortDirection = "asc" | "desc";

export type ContainerInstanceRecord = components["schemas"]["InstanceRecord"];
export type ContainerInstanceStatus = ContainerInstanceRecord["state"];
export type ContainerInstanceStatusFilter =
  "all" | "running" | "stopped" | "deploying" | "failed";
export type ContainerInstanceSearchField = "name" | "id";
export type ContainerInstanceSortField = "status" | "createdAt";

export type ContainerInstance = {
  id: string;
  name: string;
  kind: "container";
  vpc: string;
  subnet: string;
  ip: string;
  status: ContainerInstanceStatus;
  image: string;
  cpuMemory: string;
  replicas: string;
  rolloutStatus: string;
  node: string;
  endpoint: string;
  createdAt: string;
};

export type ContainerInstanceQuery = {
  status: ContainerInstanceStatusFilter;
  searchField: ContainerInstanceSearchField;
  keyword: string;
  page: number;
  pageSize: number;
  sortField?: ContainerInstanceSortField;
  sortDirection?: ListSortDirection;
};

export type ContainerInstanceStatusCounts = Record<
  ContainerInstanceStatusFilter,
  number
>;

export type ContainerInstanceListResult = {
  items: ContainerInstance[];
  total: number;
  statusCounts: ContainerInstanceStatusCounts;
  hasTransitioningInstances: boolean;
};

export interface ContainerInstanceDataSource {
  list(query: ContainerInstanceQuery): Promise<ContainerInstanceListResult>;
}
