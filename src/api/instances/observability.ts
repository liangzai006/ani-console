import { coreRequest } from "@/api/request";
import { instancePath } from "./records";
import type {
  InstanceEvent,
  InstanceMetrics,
  InstanceSecurityEvent,
  ObservabilityRangeQueryResponse,
} from "./types";
type ListResponse<T> = { items: T[]; total: number; next_cursor?: string | null };
export function getInstanceMetrics(instanceId: string): Promise<InstanceMetrics> {
  return coreRequest<InstanceMetrics>(`${instancePath(instanceId)}/metrics`, { method: "GET" });
}
export function listInstanceEvents(instanceId: string): Promise<ListResponse<InstanceEvent>> {
  return coreRequest<ListResponse<InstanceEvent>>(`${instancePath(instanceId)}/events`, {
    method: "GET",
  });
}
export function listInstanceSecurityEvents(
  instanceId: string,
  params: { severity?: string; limit?: number } = {},
): Promise<ListResponse<InstanceSecurityEvent>> {
  return coreRequest<ListResponse<InstanceSecurityEvent>>(
    `${instancePath(instanceId)}/security-events`,
    { method: "GET", params },
  );
}
export function queryObservabilityRange(params: {
  query: string;
  start: string;
  end: string;
  step: string;
}): Promise<ObservabilityRangeQueryResponse> {
  return coreRequest<ObservabilityRangeQueryResponse>("/observability/query_range", {
    method: "GET",
    params,
  });
}
export function streamInstanceLogs(
  instanceId: string,
  params: {
    level?: "debug" | "info" | "warn" | "error";
    limit?: number;
    interval_seconds?: number;
  },
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  return coreRequest<ReadableStream<Uint8Array>>(`${instancePath(instanceId)}/logs/stream`, {
    method: "GET",
    params,
    signal,
    adapter: "fetch",
    responseType: "stream",
  });
}
