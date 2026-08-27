type ListSortDirection = "asc" | "desc";

export type VmInstanceStatus = "running" | "stopped" | "error";
export type VmInstanceStatusFilter = "all" | VmInstanceStatus;
export type VmInstanceSearchField = "name" | "id";
export type VmInstanceSortField = "status" | "createdAt";
export type VmInstancePowerAction = "start" | "stop";

export type VmInstance = {
  id: string;
  name: string;
  status: VmInstanceStatus;
  spec: string;
  image: string;
  privateIp: string;
  node: string;
  terminationProtected: boolean;
  createdAt: string;
};

export type VmInstanceQuery = {
  status: VmInstanceStatusFilter;
  searchField: VmInstanceSearchField;
  keyword: string;
  page: number;
  pageSize: number;
  sortField?: VmInstanceSortField;
  sortDirection?: ListSortDirection;
};

export type VmInstanceStatusCounts = Record<VmInstanceStatusFilter, number>;

export type VmInstanceListResult = {
  items: VmInstance[];
  total: number;
  statusCounts: VmInstanceStatusCounts;
};

export interface VmInstanceDataSource {
  list(query: VmInstanceQuery): Promise<VmInstanceListResult>;
  changePowerState(ids: string[], action: VmInstancePowerAction): Promise<void>;
}
