import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type NetworkResourceState = "pending" | "available" | "failed" | "deleting" | "deleted";

export interface NetworkVPC {
  id: string;
  tenant_id: string;
  name: string;
  cidr: string;
  state: NetworkResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface NetworkSubnet {
  id: string;
  tenant_id: string;
  vpc_id: string;
  name: string;
  cidr: string;
  gateway?: string | null;
  state: NetworkResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface NetworkSubnetListParams extends CursorPageParams {
  vpc_id?: string;
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
}

export interface NetworkVPCListParams extends CursorPageParams {
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
}

export interface NetworkVPCListResponse {
  items: NetworkVPC[];
  total: number;
  next_cursor?: string | null;
}

export interface NetworkSubnetListResponse {
  items: NetworkSubnet[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateNetworkVPCInput {
  name: string;
  cidr: string;
}
export type CreateNetworkVPCRequest = CreateNetworkVPCInput & { idempotency_key: string };

export interface CreateNetworkSubnetInput {
  vpc_id: string;
  name: string;
  cidr: string;
  gateway?: string | null;
}
export type CreateNetworkSubnetRequest = CreateNetworkSubnetInput & { idempotency_key: string };

export interface NetworkSecurityGroupRule {
  direction: "ingress" | "egress";
  protocol: "tcp" | "udp" | "icmp" | "all";
  port_range: string;
  cidr: string;
  action: "allow" | "deny";
}

export interface NetworkSecurityGroupRuleResource extends NetworkSecurityGroupRule {
  id: string;
  security_group_id: string;
  priority: number;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface NetworkSecurityGroup {
  id: string;
  tenant_id: string;
  name: string;
  vpc_id?: string | null;
  description?: string | null;
  rules: NetworkSecurityGroupRule[];
  readonly rule_count?: number;
  readonly bound_instance_count?: number;
  state: NetworkResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface NetworkSecurityGroupListParams extends CursorPageParams {
  vpc_id?: string;
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
}
export interface NetworkSecurityGroupListResponse {
  items: NetworkSecurityGroup[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateNetworkSecurityGroupInput {
  name: string;
  vpc_id?: string | null;
  description?: string | null;
  rules?: NetworkSecurityGroupRule[];
}
export type CreateNetworkSecurityGroupRequest = CreateNetworkSecurityGroupInput & {
  idempotency_key: string;
};

export type NetworkSecurityGroupBindingTargetType =
  | "instance"
  | "network_interface"
  | "load_balancer";
export interface NetworkSecurityGroupBinding {
  id: string;
  security_group_id: string;
  target_type: NetworkSecurityGroupBindingTargetType;
  target_id: string;
  created_at: string;
}
export interface NetworkSecurityGroupBindingListParams extends CursorPageParams {
  target_type?: NetworkSecurityGroupBindingTargetType;
}
export interface NetworkSecurityGroupBindingListResponse {
  items: NetworkSecurityGroupBinding[];
  total: number;
  next_cursor?: string | null;
}

export interface NetworkSecurityGroupRuleListResponse {
  items: NetworkSecurityGroupRuleResource[];
  total: number;
  next_cursor?: string | null;
}
export interface SaveNetworkSecurityGroupRuleInput {
  priority: number;
  direction: "ingress" | "egress";
  protocol: "tcp" | "udp" | "icmp" | "all";
  port_range: string;
  cidr: string;
  action: "allow" | "deny";
  description?: string | null;
}
export type SaveNetworkSecurityGroupRuleRequest = SaveNetworkSecurityGroupRuleInput & {
  idempotency_key: string;
};

export interface NetworkLoadBalancerListener {
  protocol: "http" | "https" | "tcp";
  port: number;
  target_port: number;
}
export interface NetworkLoadBalancer {
  id: string;
  tenant_id: string;
  name: string;
  vpc_id: string;
  subnet_id?: string | null;
  scheme: "internal" | "public";
  vip?: string | null;
  listeners: NetworkLoadBalancerListener[];
  state: NetworkResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}
export interface NetworkLoadBalancerListParams extends CursorPageParams {
  vpc_id?: string;
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
}
export interface NetworkLoadBalancerListResponse {
  items: NetworkLoadBalancer[];
  total: number;
  next_cursor?: string | null;
}
export interface CreateNetworkLoadBalancerInput {
  name: string;
  vpc_id: string;
  subnet_id?: string | null;
  scheme: "internal" | "public";
  listeners?: NetworkLoadBalancerListener[];
}
export type CreateNetworkLoadBalancerRequest = CreateNetworkLoadBalancerInput & {
  idempotency_key: string;
};

export interface NetworkRoute {
  id: string;
  vpc_id: string;
  destination_cidr: string;
  next_hop_type: "gateway" | "instance" | "nat";
  next_hop_id: string;
  description?: string | null;
  created_at: string;
  dev_profile: CoreDevProfileInfo;
}
export interface NetworkRouteListParams extends CursorPageParams {
  vpc_id?: string;
  subnet_id?: string;
  status?: string;
  search_field?: "description" | "id";
  keyword?: string;
}
export interface NetworkRouteListResponse {
  items: NetworkRoute[];
  total: number;
  next_cursor?: string | null;
}
export interface CreateNetworkRouteInput {
  vpc_id: string;
  destination_cidr: string;
  next_hop_type: "gateway" | "instance" | "nat";
  next_hop_id: string;
  description?: string;
}
export type CreateNetworkRouteRequest = CreateNetworkRouteInput & { idempotency_key: string };
