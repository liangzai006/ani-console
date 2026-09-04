import { coreApi } from "@/api/client";
import type {
  ContainerDetailDataSource,
  ContainerDetailInstance,
} from "./types";

function buildDetail(
  record: Record<string, unknown>,
): ContainerDetailInstance | undefined {
  const compute = record.compute as Record<string, unknown> | undefined;
  return {
    ...record,
    kind: "container",
    node_name: (compute?.node_name ?? record.node_name) as string | null,
  } as ContainerDetailInstance;
}

export const containerDetailDataSource: ContainerDetailDataSource = {
  async getDetail(instanceId: string) {
    const { data, error } = await coreApi.GET("/instances/{instance_id}", {
      params: { path: { instance_id: instanceId } },
    });
    if (error) throw error;
    const record = data as Record<string, unknown> | undefined;
    if (!record || record.kind !== "container") return undefined;
    return buildDetail(record);
  },

  async changePowerState(instanceId, body) {
    const { error, response } = await coreApi.POST(
      "/instances/{instance_id}/lifecycle",
      {
        params: { path: { instance_id: instanceId } },
        body,
      },
    );
    if (error) {
      throw {
        ...(typeof error === "object" && error
          ? error
          : { message: String(error) }),
        status: response?.status,
      };
    }
  },
};
