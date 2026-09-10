import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateNetworkVPCInput,
  CreateNetworkVPCRequest,
  NetworkVPC,
  NetworkVPCListParams,
  NetworkVPCListResponse,
} from "./types";

const createScope = createIdempotencyScope("network-vpc-create", ["POST"]);
const vpcPath = (vpcId: string) => `/networks/vpcs/${encodeURIComponent(vpcId)}`;

export function listNetworkVpcs(
  params: NetworkVPCListParams = {},
): Promise<NetworkVPCListResponse> {
  return coreRequest<NetworkVPCListResponse>("/networks/vpcs", { method: "GET", params });
}

export function createNetworkVpc(submitData: CreateNetworkVPCInput): Promise<NetworkVPC> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<NetworkVPC, CreateNetworkVPCRequest>("/networks/vpcs", {
      method: "POST",
      data: body,
    }),
  );
}

export function getNetworkVpc(vpcId: string): Promise<NetworkVPC> {
  return coreRequest<NetworkVPC>(vpcPath(vpcId), { method: "GET" });
}

export function deleteNetworkVpc(vpcId: string): Promise<NetworkVPC> {
  return coreRequest<NetworkVPC>(vpcPath(vpcId), { method: "DELETE" });
}
