import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateNetworkLoadBalancerInput,
  CreateNetworkLoadBalancerRequest,
  NetworkLoadBalancer,
  NetworkLoadBalancerListParams,
  NetworkLoadBalancerListResponse,
} from "./types";

const createScope = createIdempotencyScope("network-load-balancer-create", ["POST"]);
const loadBalancerPath = (loadBalancerId: string) =>
  `/networks/load-balancers/${encodeURIComponent(loadBalancerId)}`;

export function listNetworkLoadBalancers(
  params: NetworkLoadBalancerListParams = {},
): Promise<NetworkLoadBalancerListResponse> {
  return coreRequest<NetworkLoadBalancerListResponse>("/networks/load-balancers", {
    method: "GET",
    params,
  });
}

export function createNetworkLoadBalancer(
  submitData: CreateNetworkLoadBalancerInput,
): Promise<NetworkLoadBalancer> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<NetworkLoadBalancer, CreateNetworkLoadBalancerRequest>("/networks/load-balancers", {
      method: "POST",
      data: body,
    }),
  );
}

export function getNetworkLoadBalancer(loadBalancerId: string): Promise<NetworkLoadBalancer> {
  return coreRequest<NetworkLoadBalancer>(loadBalancerPath(loadBalancerId), { method: "GET" });
}

export function deleteNetworkLoadBalancer(loadBalancerId: string): Promise<NetworkLoadBalancer> {
  return coreRequest<NetworkLoadBalancer>(loadBalancerPath(loadBalancerId), { method: "DELETE" });
}
