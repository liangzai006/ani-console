import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateNetworkSubnetInput,
  CreateNetworkSubnetRequest,
  NetworkSubnet,
  NetworkSubnetListParams,
  NetworkSubnetListResponse,
} from "./types";

const createScope = createIdempotencyScope("network-subnet-create", ["POST"]);
const subnetPath = (subnetId: string) => `/networks/subnets/${encodeURIComponent(subnetId)}`;

export function listNetworkSubnets(
  params: NetworkSubnetListParams = {},
): Promise<NetworkSubnetListResponse> {
  return coreRequest<NetworkSubnetListResponse>("/networks/subnets", { method: "GET", params });
}

export function createNetworkSubnet(submitData: CreateNetworkSubnetInput): Promise<NetworkSubnet> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<NetworkSubnet, CreateNetworkSubnetRequest>("/networks/subnets", {
      method: "POST",
      data: body,
    }),
  );
}

export function getNetworkSubnet(subnetId: string): Promise<NetworkSubnet> {
  return coreRequest<NetworkSubnet>(subnetPath(subnetId), { method: "GET" });
}

export function deleteNetworkSubnet(subnetId: string): Promise<NetworkSubnet> {
  return coreRequest<NetworkSubnet>(subnetPath(subnetId), { method: "DELETE" });
}
