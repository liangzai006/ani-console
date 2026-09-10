import type { InstanceRecord } from "@/api/instances";
import type { NavigateFn } from "@tanstack/react-router";

type Instance = Pick<InstanceRecord, "id" | "kind">;

export function navigateToInstanceDetail(navigate: NavigateFn, instance: Instance) {
  if (instance.kind === "vm") {
    void navigate({
      to: "/vm-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "container") {
    void navigate({
      to: "/container-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "gpu_container") {
    void navigate({
      to: "/gpu-instances/$instanceId",
      params: { instanceId: instance.id },
    });
    return;
  }
  if (instance.kind === "sandbox") {
    void navigate({
      to: "/sandbox-instances/$instanceId",
      params: { instanceId: instance.id },
    });
  }
}
