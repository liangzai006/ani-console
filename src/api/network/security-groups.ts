import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import type { CursorPageParams } from "@/api/types";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateNetworkSecurityGroupInput,
  CreateNetworkSecurityGroupRequest,
  NetworkSecurityGroup,
  NetworkSecurityGroupBindingListParams,
  NetworkSecurityGroupBindingListResponse,
  NetworkSecurityGroupListParams,
  NetworkSecurityGroupListResponse,
  NetworkSecurityGroupRuleListResponse,
  NetworkSecurityGroupRuleResource,
  SaveNetworkSecurityGroupRuleInput,
  SaveNetworkSecurityGroupRuleRequest,
} from "./types";

const createScope = createIdempotencyScope("network-security-group-create", ["POST"]);
const createRuleScope = createIdempotencyScope("network-security-group-rule-create", ["POST"]);
const updateRuleScope = createIdempotencyScope("network-security-group-rule-update", ["PUT"]);
const securityGroupPath = (securityGroupId: string) =>
  `/networks/security-groups/${encodeURIComponent(securityGroupId)}`;

export function listNetworkSecurityGroups(
  params: NetworkSecurityGroupListParams = {},
): Promise<NetworkSecurityGroupListResponse> {
  return coreRequest<NetworkSecurityGroupListResponse>("/networks/security-groups", {
    method: "GET",
    params,
  });
}

export function createNetworkSecurityGroup(
  submitData: CreateNetworkSecurityGroupInput,
): Promise<NetworkSecurityGroup> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<NetworkSecurityGroup, CreateNetworkSecurityGroupRequest>(
      "/networks/security-groups",
      { method: "POST", data: body },
    ),
  );
}

export function copyNetworkSecurityGroup(
  source: NetworkSecurityGroup,
): Promise<NetworkSecurityGroup> {
  const submitData: CreateNetworkSecurityGroupInput = {
    name: `${source.name}-copy`,
    vpc_id: source.vpc_id,
    description: source.description,
    rules: source.rules,
  };
  return runIdempotentRequest(
    createScope,
    submitData,
    (body) =>
      coreRequest<NetworkSecurityGroup, CreateNetworkSecurityGroupRequest>(
        "/networks/security-groups",
        { method: "POST", data: body },
      ),
    [source.id],
  );
}

export function getNetworkSecurityGroup(securityGroupId: string): Promise<NetworkSecurityGroup> {
  return coreRequest<NetworkSecurityGroup>(securityGroupPath(securityGroupId), { method: "GET" });
}

export function deleteNetworkSecurityGroup(securityGroupId: string): Promise<NetworkSecurityGroup> {
  return coreRequest<NetworkSecurityGroup>(securityGroupPath(securityGroupId), {
    method: "DELETE",
  });
}

export function listNetworkSecurityGroupBindings(
  securityGroupId: string,
  params: NetworkSecurityGroupBindingListParams = {},
): Promise<NetworkSecurityGroupBindingListResponse> {
  return coreRequest<NetworkSecurityGroupBindingListResponse>(
    `${securityGroupPath(securityGroupId)}/bindings`,
    { method: "GET", params },
  );
}

export function listNetworkSecurityGroupRules(
  securityGroupId: string,
  params: CursorPageParams = {},
): Promise<NetworkSecurityGroupRuleListResponse> {
  return coreRequest<NetworkSecurityGroupRuleListResponse>(
    `${securityGroupPath(securityGroupId)}/rules`,
    { method: "GET", params },
  );
}

export function createNetworkSecurityGroupRule(
  securityGroupId: string,
  submitData: SaveNetworkSecurityGroupRuleInput,
): Promise<NetworkSecurityGroupRuleResource> {
  return runIdempotentRequest(
    createRuleScope,
    submitData,
    (body) =>
      coreRequest<NetworkSecurityGroupRuleResource, SaveNetworkSecurityGroupRuleRequest>(
        `${securityGroupPath(securityGroupId)}/rules`,
        { method: "POST", data: body },
      ),
    [securityGroupId],
  );
}

export function updateNetworkSecurityGroupRule(
  securityGroupId: string,
  ruleId: string,
  submitData: SaveNetworkSecurityGroupRuleInput,
): Promise<NetworkSecurityGroupRuleResource> {
  return runIdempotentRequest(
    updateRuleScope,
    submitData,
    (body) =>
      coreRequest<NetworkSecurityGroupRuleResource, SaveNetworkSecurityGroupRuleRequest>(
        `${securityGroupPath(securityGroupId)}/rules/${encodeURIComponent(ruleId)}`,
        { method: "PUT", data: body },
      ),
    [securityGroupId, ruleId],
  );
}

export function deleteNetworkSecurityGroupRule(
  securityGroupId: string,
  ruleId: string,
): Promise<NetworkSecurityGroupRuleListResponse> {
  return coreRequest<NetworkSecurityGroupRuleListResponse>(
    `${securityGroupPath(securityGroupId)}/rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE" },
  );
}
