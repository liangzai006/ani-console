import type { ReactNode } from "react";
import type { components } from "@/api/core-schema";

type InstanceRecord = components["schemas"]["InstanceRecord"];

export type ContainerDetailPowerAction =
  "start" | "stop" | "restart" | "delete";
type LifecycleRequest = components["schemas"]["InstanceLifecycleRequest"];

export type ContainerDetailInstance = InstanceRecord & { kind: "container" };

export type ContainerDetailDataSource = {
  getDetail(instanceId: string): Promise<ContainerDetailInstance | undefined>;
  changePowerState(instanceId: string, body: LifecycleRequest): Promise<void>;
};

export type ContainerActionButton = {
  key: string;
  label: ReactNode;
  disabled?: boolean;
};
