import type { components } from "@/api/core-schema";
export type ContainerInstanceRecord = components["schemas"]["InstanceRecord"];
export type ContainerInstanceStatus = ContainerInstanceRecord["state"];
export type ContainerInstanceStatusFilter = "all" | "running" | "stopped" | "deploying" | "failed";
export type ContainerInstanceSearchField = "name" | "id";

export type ContainerInstance = {
  record: ContainerInstanceRecord;
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
};

export type ContainerInstanceListResult = {
  items: ContainerInstance[];
  total: number;
  hasTransitioningInstances: boolean;
};

export interface ContainerInstanceDataSource {
  list(query: ContainerInstanceQuery): Promise<ContainerInstanceListResult>;
}
