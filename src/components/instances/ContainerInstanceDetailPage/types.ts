import type { InstanceLifecycleRequest, InstanceRecord } from "@/api/instances";
import type { ReactNode } from "react";

export type ContainerDetailPowerAction = "start" | "stop" | "restart" | "delete";
type LifecycleRequest = InstanceLifecycleRequest;

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
