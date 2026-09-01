import { InstanceTerminal } from "@/components/instances/InstanceTerminal";

export function GpuInstanceTerminal({ instanceId }: { instanceId: string }) {
  return <InstanceTerminal instanceId={instanceId} height={520} />;
}
